import React from 'react';

interface HeaderProps {
  showHsv: boolean;
  onToggleDebug: () => void;
  onToggleAbout: () => void;
}

const LOGO_COLORS = [
  '#FF4444', '#FFD700', '#22C55E',
  '#FF8C00', '#3B82F6', '#FFFFFF',
  '#FF4444', '#22C55E', '#FFD700'
];

export const Header: React.FC<HeaderProps> = ({ showHsv, onToggleDebug, onToggleAbout }) => {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-cube" id="logoCube">
          {LOGO_COLORS.map((col, idx) => (
            <span key={idx} style={{ background: col }} />
          ))}
        </div>
        RUBIO-CUBIO
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          className="hbtn"
          onClick={onToggleDebug}
          id="dbgBtn"
          style={{ color: showHsv ? 'var(--text)' : 'var(--muted)' }}
        >
          HSV
        </button>
        <button className="hbtn" onClick={onToggleAbout}>
          ABOUT
        </button>
      </div>
    </header>
  );
};
