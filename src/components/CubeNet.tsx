import React from 'react';
import { NET, FACES } from '../constants';
import type { FaceId } from '../types';

interface CubeNetProps {
  curFaceIdx: number;
  data: Record<FaceId, string[] | null>;
  onJumpToFace: (idx: number) => void;
}

export const CubeNet: React.FC<CubeNetProps> = ({ curFaceIdx, data, onJumpToFace }) => {
  return (
    <div className="cube-net">
      {NET.map((row, rowIdx) =>
        row.map((fid, colIdx) => {
          const key = `cell-${rowIdx}-${colIdx}`;
          if (!fid) {
            return <div key={key} className="nf ph" />;
          }

          const faceIdx = FACES.findIndex((f) => f.id === fid);
          const isCur = faceIdx === curFaceIdx;
          const isDone = data[fid] !== null;
          const colors = data[fid] || Array(9).fill('#1A1A24');

          return (
            <div
              key={key}
              className={`nf ${isCur ? 'cur' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => onJumpToFace(faceIdx)}
            >
              {colors.map((c, idx) => (
                <div
                  key={idx}
                  className="mc"
                  style={{
                    borderRadius: '1px',
                    background: isDone ? c : '#1A1A24'
                  }}
                />
              ))}
              <div className="nf-lbl">{FACES[faceIdx].name}</div>
            </div>
          );
        })
      )}
    </div>
  );
};
