import React from 'react';
import { FACES } from '../constants';
import type { FaceId } from '../types';

interface FaceListProps {
  curFaceIdx: number;
  data: Record<FaceId, string[] | null>;
  onJumpToFace: (idx: number) => void;
}

export const FaceList: React.FC<FaceListProps> = ({ curFaceIdx, data, onJumpToFace }) => {
  return (
    <div className="flist" id="flist">
      {FACES.map((f, i) => {
        const isCur = i === curFaceIdx;
        const isDone = data[f.id] !== null;
        const colors = data[f.id] || Array(9).fill('#1A1A24');

        return (
          <div
            key={f.id}
            className={`fi ${isCur ? 'cur' : ''} ${isDone ? 'done' : ''}`}
            onClick={() => onJumpToFace(i)}
          >
            <div className="fmini">
              {colors.map((c, idx) => (
                <div
                  key={idx}
                  className="fmc"
                  style={{ background: isDone ? c : '#1A1A24' }}
                />
              ))}
            </div>
            <div className="fn">
              <div className="fn-name">{f.id} — {f.name}</div>
              <div className="fn-st">
                {isDone ? 'Scanned' : isCur ? 'Scanning now' : 'Pending'}
              </div>
            </div>
            {isDone && (
              <div className="fcheck">
                <svg width="7" height="7" viewBox="0 0 10 10">
                  <polyline points="2,5 4,7 8,3" stroke="#22C55E" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
