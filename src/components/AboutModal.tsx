import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).id === 'aboutModal') {
      onClose();
    }
  };

  return (
    <div
      className={`mbg ${isOpen ? 'on' : ''}`}
      id="aboutModal"
      onClick={handleBackgroundClick}
    >
      <div className="modal">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mtitle">How it works</div>
        <div className="ai">
          <div className="atag">Canvas</div>
          <div className="adesc">
            Your image is drawn to an offscreen canvas. The 9 cell centers of your crop box are sampled for raw RGB.{' '}
            <small style={{ color: 'var(--muted)' }}>No data leaves your browser.</small>
          </div>
        </div>
        <div className="ai">
          <div className="atag">HSV</div>
          <div className="adesc">
            RGB → HSV normalises for lighting. Each sample is classified to the nearest of 6 center-sticker anchors by weighted HSV distance.
          </div>
        </div>
        <div className="ai">
          <div className="atag">WASM</div>
          <div className="adesc">
            The 54-char string feeds a C++ Kociemba Two-Phase solver compiled to WebAssembly — no server required.
          </div>
        </div>
        <div className="ai">
          <div className="atag">3D</div>
          <div className="adesc">
            Solution moves animate an interactive Three.js cube with smooth 90° layer rotations and orbital controls.
          </div>
        </div>
      </div>
    </div>
  );
};
