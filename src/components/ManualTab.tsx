import React, { useState, useEffect } from 'react';
import { FACES } from '../constants';
import type { FaceId } from '../types';

interface ManualTabProps {
  curFaceIdx: number;
  manColors: Record<FaceId, (string | null)[]>;
  onUpdateManColors: (fid: FaceId, colors: (string | null)[]) => void;
  onConfirmFace: (colors: string[]) => void;
  setNote: (msg: string) => void;
}

export const ManualTab: React.FC<ManualTabProps> = ({
  curFaceIdx,
  manColors,
  onUpdateManColors,
  onConfirmFace,
  setNote,
}) => {
  const f = FACES[curFaceIdx];
  const currentFaceColors = manColors[f.id] || Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null);

  const [selCell, setSelCell] = useState<number | null>(null);
  const [selCol, setSelCol] = useState<string | null>(null);

  // Reset selection state when face changes
  useEffect(() => {
    setSelCell(null);
    setSelCol(null);
  }, [curFaceIdx]);

  const paintCell = (col: string) => {
    if (selCell === null || selCell === 4) return;
    setSelCol(col);
    const updated = [...currentFaceColors];
    updated[selCell] = col;
    onUpdateManColors(f.id, updated);
  };

  const handleClear = () => {
    const cleared = Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null);
    onUpdateManColors(f.id, cleared);
    setSelCell(null);
    setSelCol(null);
  };

  const handleConfirm = () => {
    const unset = currentFaceColors.filter(c => !c).length;
    if (unset > 0) {
      setNote(`${unset} cell${unset > 1 ? 's' : ''} unassigned.`);
      return;
    }
    // We cast to string[] because all entries are now non-null
    onConfirmFace(currentFaceColors as string[]);
  };

  return (
    <div id="t-manual">
      <div className="manual-body">
        <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '10px', lineHeight: 1.6 }}>
          Click a cell then pick its color. Center sticker is locked.
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="m3x3" id="manGrid">
            {currentFaceColors.map((col, idx) => {
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
                  onClick={() => {
                    if (!isCenter) {
                      setSelCell(idx);
                    }
                  }}
                />
              );
            })}
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '7px', textTransform: 'uppercase' }}>
              Color
            </div>
            <div className="pal" id="pal">
              {FACES.map(face => {
                const isSelected = selCol === face.hex;
                const isWhiteOrYellow = face.id === 'U' || face.id === 'D';
                return (
                  <div
                    key={face.id}
                    className={`pc ${isSelected ? 'on' : ''}`}
                    style={{
                      background: face.hex,
                      border: isWhiteOrYellow ? `2px solid ${isSelected ? '#fff' : '#555'}` : undefined,
                    }}
                    onClick={() => paintCell(face.hex)}
                  />
                );
              })}
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: '5px', padding: '7px 9px', fontSize: '9px', color: 'var(--muted)', lineHeight: '1.7', marginTop: '9px', maxWidth: '150px' }}>
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
