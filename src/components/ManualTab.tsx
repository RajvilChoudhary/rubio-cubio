import React, { useState, useEffect } from 'react';
import { FACES } from '../constants';
import type { FaceId } from '../types';

interface ManualTabProps {
  curFaceIdx: number;
  /** Currently confirmed colors for this face (null = not yet set) */
  initialColors: string[] | null;
  onUpdateManColors: (fid: FaceId, colors: (string | null)[]) => void;
  onConfirmFace: (colors: string[]) => void;
  setNote: (msg: string) => void;
}

export const ManualTab: React.FC<ManualTabProps> = ({
  curFaceIdx,
  initialColors,
  onUpdateManColors,
  onConfirmFace,
  setNote,
}) => {
  const f = FACES[curFaceIdx];

  // Local grid state — initialized from confirmed data or defaults
  const [cells, setCells] = useState<(string | null)[]>(() =>
    initialColors ? [...initialColors] : Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null)
  );
  const [selCell, setSelCell] = useState<number | null>(null);
  const [selCol, setSelCol] = useState<string | null>(null);

  // When face changes, re-initialize from the confirmed data for that face
  useEffect(() => {
    const next = initialColors
      ? [...initialColors]
      : Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null);
    setCells(next);
    setSelCell(null);
    setSelCol(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curFaceIdx]);

  // Also sync if initialColors change for the same face (e.g. state string pasted)
  useEffect(() => {
    if (initialColors) {
      setCells([...initialColors]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialColors]);

  const paintCell = (col: string) => {
    if (selCell === null || selCell === 4) return;
    setSelCol(col);
    const updated = [...cells];
    updated[selCell] = col;
    setCells(updated);
    onUpdateManColors(f.id, updated);
  };

  const handleClear = () => {
    const cleared = Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null);
    setCells(cleared);
    setSelCell(null);
    setSelCol(null);
    onUpdateManColors(f.id, cleared);
  };

  const handleConfirm = () => {
    const unset = cells.filter(c => !c).length;
    if (unset > 0) { setNote(`${unset} cell${unset > 1 ? 's' : ''} unassigned.`); return; }
    onConfirmFace(cells as string[]);
  };

  return (
    <div id="t-manual">
      <div className="manual-body">
        <div className="manual-hint">
          Click a cell then pick its color. Center sticker is locked.
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="m3x3" id="manGrid">
            {cells.map((col, idx) => {
              const isCenter = idx === 4;
              const isSelected = selCell === idx;
              return (
                <div
                  key={idx}
                  className={`facelet ${isCenter ? '' : isSelected ? 'sel' : ''}`}
                  style={{
                    background: col || 'var(--surface2)',
                    border: !col && !isCenter ? '1.5px dashed var(--border)' : undefined,
                    cursor: isCenter ? 'not-allowed' : 'pointer',
                  }}
                  title={isCenter ? 'Center — fixed' : undefined}
                  onClick={() => { if (!isCenter) setSelCell(idx); }}
                />
              );
            })}
          </div>
          <div>
            <div className="manual-pal-label">Color</div>
            <div className="pal" id="pal">
              {FACES.map(face => {
                const isSelected = selCol === face.hex;
                const needsBorder = face.id === 'U' || face.id === 'D';
                return (
                  <div
                    key={face.id}
                    className={`pc ${isSelected ? 'on' : ''}`}
                    style={{
                      background: face.hex,
                      border: needsBorder ? `2px solid ${isSelected ? '#fff' : '#555'}` : undefined,
                    }}
                    onClick={() => paintCell(face.hex)}
                  />
                );
              })}
            </div>
            <div className="manual-tip">
              Center sticker defines<br />the face identity.
            </div>
          </div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-p" onClick={handleConfirm}>Confirm face</button>
        <button className="btn btn-g" onClick={handleClear}>Reset</button>
      </div>
    </div>
  );
};
