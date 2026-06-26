import React from 'react';
import { Cube3DViewer } from './Cube3DViewer';

interface SolutionModalProps {
  isOpen: boolean;
  solution: string;
  initialStateStr: string;
  onClose: () => void;
}

export const SolutionModal: React.FC<SolutionModalProps> = ({ isOpen, solution, initialStateStr, onClose }) => {
  const moves = solution ? solution.trim().split(/\s+/) : [];
  const isSolved = solution === '' || solution === 'Already Solved!' || (moves.length === 0 && solution);

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).id === 'solutionModal') onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(solution).catch(() => {});
  };

  if (!isOpen) return null;

  return (
    <div
      className={`mbg ${isOpen ? 'on' : ''}`}
      id="solutionModal"
      onClick={handleBackgroundClick}
    >
      <div className="modal sol-modal" style={{ maxWidth: '420px', width: '100%' }}>
        <button className="mclose" onClick={onClose} aria-label="Close">✕</button>

        <div className="sol-header">
          <div className="sol-icon">
            {isSolved ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
          </div>
          <div>
            <div className="mtitle" style={{ marginBottom: 2 }}>
              {isSolved ? 'Already Solved!' : 'Solution Found'}
            </div>
            {!isSolved && (
              <div className="sol-subtitle">{moves.length} move{moves.length !== 1 ? 's' : ''}</div>
            )}
          </div>
        </div>

        {!isSolved && (
          <>
            <Cube3DViewer stateStr={initialStateStr} solution={solution} />

            <div className="sol-raw" style={{ marginTop: '16px' }}>
              <span className="sol-raw-text">{solution}</span>
            </div>

            <div className="sol-actions">
              <button className="sol-copy-btn" onClick={handleCopy}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Moves
              </button>
              <button className="sol-close-btn" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {isSolved && (
          <div className="sol-actions" style={{ marginTop: 16 }}>
            <button className="sol-close-btn" style={{ flex: 1 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

