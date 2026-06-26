import React, { useState, useEffect } from 'react';
import { FACES, TOP_HINT } from './constants';
import type { FaceId } from './types';
import { Header } from './components/Header';
import { AboutModal } from './components/AboutModal';
import { CubeNet } from './components/CubeNet';
import { FaceList } from './components/FaceList';
import { UploadTab } from './components/UploadTab';
import { CameraTab } from './components/CameraTab';
import { ManualTab } from './components/ManualTab';

const initialManColors = FACES.reduce((acc, f) => {
  acc[f.id] = Array(9).fill(null).map((_, i) => i === 4 ? f.hex : null);
  return acc;
}, {} as Record<FaceId, (string | null)[]>);

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const STORAGE_KEY = 'rubio-cubio-progress';

export const App: React.FC = () => {
  const [curFaceIdx, setCurFaceIdx] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').curFaceIdx ?? 0; } catch { return 0; }
  });
  const [data, setData] = useState<Record<FaceId, string[] | null>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').data;
      return saved ?? { U: null, R: null, F: null, D: null, L: null, B: null };
    } catch { return { U: null, R: null, F: null, D: null, L: null, B: null }; }
  });
  const [manColors, setManColors] = useState<Record<FaceId, (string | null)[]>>(initialManColors);
  const [tab, setTab] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showHsv, setShowHsv] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');

  // Persist progress to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, curFaceIdx }));
  }, [data, curFaceIdx]);

  const f = FACES[curFaceIdx];
  const stepSubText = `Point the ${f.name.toLowerCase()} center face at the camera. ${TOP_HINT[f.id] || ''}. Drag the box to align with the cube face.`;

  const handleToggleDebug = () => {
    setShowHsv(prev => !prev);
  };

  const handleToggleAbout = () => {
    setIsAboutOpen(prev => !prev);
  };

  const handleJumpToFace = (idx: number) => {
    setCurFaceIdx(idx);
    setImageSrc(null);
  };

  const handleTabSwitch = (newTab: 'upload' | 'camera' | 'manual') => {
    setTab(newTab);
  };

  const handleConfirmFace = (colors: string[]) => {
    const activeFace = FACES[curFaceIdx];
    setData(prev => ({ ...prev, [activeFace.id]: colors }));

    if (curFaceIdx < 5) {
      setCurFaceIdx(prev => prev + 1);
      setImageSrc(null);
    }
  };

  const handleUpdateManColors = (fid: FaceId, colors: (string | null)[]) => {
    setManColors(prev => ({ ...prev, [fid]: colors }));
  };

  const triggerNotification = (msg: string) => {
    setNote(msg);
    if (msg) {
      setTimeout(() => setNote(''), 3000);
    }
  };

  const doSolve = () => {
    triggerNotification('Phase 3 next — WASM solver…');
    setTimeout(() => {
      if (typeof (window as any).sendPrompt === 'function') {
        (window as any).sendPrompt(
          'Phase 1 & 2 done. Crop-box CV pipeline working. Proceed to Phase 3: Kociemba WASM solver + Phase 4: Three.js simulation.'
        );
      } else {
        console.log('sendPrompt called, but not defined globally.');
      }
    }, 800);
  };

  const compileNotation = () => {
    const c2id: Record<string, FaceId> = {};
    FACES.forEach(face => {
      c2id[face.hex] = face.id;
    });

    const doneCount = Object.values(data).filter(Boolean).length;
    if (doneCount === 0) {
      return <span style={{ color: 'var(--subtle)' }}>Scan all 6 faces…</span>;
    }

    const elements: React.ReactNode[] = [];
    let keyIdx = 0;
    FACES.forEach(face => {
      const faceColors = data[face.id];
      if (faceColors) {
        faceColors.forEach(col => {
          const id = c2id[col] || '?';
          elements.push(
            <span key={keyIdx++} className={`nc ${id}`}>
              {id}
            </span>
          );
        });
      } else {
        for (let i = 0; i < 9; i++) {
          elements.push(
            <span key={keyIdx++} className="nc" style={{ color: 'var(--subtle)' }}>
              ·
            </span>
          );
        }
      }
    });

    return elements;
  };

  return (
    <>
      <Header
        showHsv={showHsv}
        onToggleDebug={handleToggleDebug}
        onToggleAbout={handleToggleAbout}
      />

      <div className="shell">
        {/* LEFT */}
        <div className="left">
          <div>
            <div className="slabel">Step {curFaceIdx + 1} of 6</div>
            <div className="sheading">
              Scan the <span style={{ color: f.hex }}>{f.name}</span> face
            </div>
            <div className="ssub">{stepSubText}</div>
          </div>

          {/* CUBE NET */}
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Progress
            </div>
            <CubeNet
              curFaceIdx={curFaceIdx}
              data={data}
              onJumpToFace={handleJumpToFace}
            />
          </div>

          {/* TABS */}
          <div className="tabs">
            <button
              className={`tab ${tab === 'upload' ? 'on' : ''}`}
              onClick={() => handleTabSwitch('upload')}
            >
              Upload
            </button>
            {isMobile && (
              <button
                className={`tab ${tab === 'camera' ? 'on' : ''}`}
                onClick={() => handleTabSwitch('camera')}
                id="camTab"
              >
                Camera
              </button>
            )}
            <button
              className={`tab ${tab === 'manual' ? 'on' : ''}`}
              onClick={() => handleTabSwitch('manual')}
            >
              Manual
            </button>
          </div>

          {/* CARD */}
          <div className="card">
            {tab === 'upload' && (
              <UploadTab
                curFaceIdx={curFaceIdx}
                imageSrc={imageSrc}
                setImageSrc={setImageSrc}
                showHsv={showHsv}
                onConfirmFace={handleConfirmFace}
              />
            )}
            {tab === 'camera' && (
              <CameraTab
                onFrameCaptured={(src) => {
                  setImageSrc(src);
                  setTab('upload');
                }}
              />
            )}
            {tab === 'manual' && (
              <ManualTab
                curFaceIdx={curFaceIdx}
                manColors={manColors}
                onUpdateManColors={handleUpdateManColors}
                onConfirmFace={handleConfirmFace}
                setNote={triggerNotification}
              />
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div>
            <div className="plabel">All 6 Faces</div>
            <FaceList
              curFaceIdx={curFaceIdx}
              data={data}
              onJumpToFace={handleJumpToFace}
            />
          </div>
          <div>
            <div className="plabel">State string (54 chars)</div>
            <div className="notation" id="notation">
              {compileNotation()}
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              className="solve-btn"
              id="solveBtn"
              disabled={Object.values(data).filter(Boolean).length < 6}
              onClick={doSolve}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Solve cube
            </button>
            <div className="snote" id="snote">
              {note}
            </div>
          </div>
        </div>
      </div>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={handleToggleAbout}
      />
    </>
  );
};
