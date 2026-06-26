import React, { useState, useEffect, useRef } from 'react';
import { FACES, TOP_HINT } from './constants';
import type { FaceId } from './types';
import { Header } from './components/Header';
import { AboutModal } from './components/AboutModal';
import { CubeNet } from './components/CubeNet';
import { FaceList } from './components/FaceList';
import { UploadTab } from './components/UploadTab';
import { CameraTab } from './components/CameraTab';
import { ManualTab } from './components/ManualTab';
import { SolutionModal } from './components/SolutionModal';
import cubeBundleUrl from './cubeBundle.js?url';

// --- constants ---
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const STORAGE_KEY = 'rubio-cubio-progress';
const EMPTY_DATA: Record<FaceId, string[] | null> = { U: null, R: null, F: null, D: null, L: null, B: null };

// --- helpers ---
const id2hex = Object.fromEntries(FACES.map(f => [f.id, f.hex])) as Record<FaceId, string>;
const hex2id = Object.fromEntries(FACES.map(f => [f.hex, f.id])) as Record<string, FaceId>;

/** Build 54-char state string from face data (uses · for missing faces) */
function dataToStateStr(data: Record<FaceId, string[] | null>): string {
  return FACES.map(f => {
    const cols = data[f.id];
    if (!cols) return '·········';
    return cols.map(c => hex2id[c] || '?').join('');
  }).join('');
}

/** Parse 54-char state string into face data. Returns null if invalid. */
function stateStrToData(raw: string): Record<FaceId, string[]> | null {
  const str = raw.trim().toUpperCase();
  if (str.length !== 54) return null;
  const valid = new Set(['U', 'R', 'F', 'D', 'L', 'B']);
  if ([...str].some(c => !valid.has(c))) return null;
  const result = {} as Record<FaceId, string[]>;
  FACES.forEach((f, i) => {
    result[f.id] = str.slice(i * 9, i * 9 + 9).split('').map(c => id2hex[c as FaceId]);
  });
  return result;
}

/** Validate a 54-char state string: each color exactly 9×, centers correct. */
function validateStateStr(str: string): string | null {
  // Count each face ID
  const counts: Record<string, number> = {};
  for (const c of str) counts[c] = (counts[c] || 0) + 1;
  for (const face of FACES) {
    if ((counts[face.id] || 0) !== 9)
      return `Color ${face.id} (${face.name}) appears ${counts[face.id] || 0} times, expected 9.`;
  }
  // Check center stickers (positions 4,13,22,31,40,49)
  for (let i = 0; i < FACES.length; i++) {
    const centerChar = str[i * 9 + 4];
    if (centerChar !== FACES[i].id)
      return `Center of ${FACES[i].name} face should be ${FACES[i].id}, got ${centerChar}.`;
  }
  return null; // valid
}

export const App: React.FC = () => {
  // ── Single source of truth for all confirmed face colors ──────────────
  const [data, setData] = useState<Record<FaceId, string[] | null>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved.data ?? EMPTY_DATA;
    } catch { return EMPTY_DATA; }
  });

  // ── UI state ─────────────────────────────────────────────────────────
  const [curFaceIdx, setCurFaceIdx] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').curFaceIdx ?? 0; }
    catch { return 0; }
  });
  const [tab, setTab] = useState<'upload' | 'camera' | 'manual'>('manual');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showHsv, setShowHsv] = useState(false);
  const [note, setNote] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Editable state string (controlled, synced with data)
  const [stateInput, setStateInput] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const d = saved.data ?? EMPTY_DATA;
      const s = dataToStateStr(d);
      return s.includes('·') ? '' : s;
    } catch { return ''; }
  });

  // ── Persist ───────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ curFaceIdx, data }));
  }, [curFaceIdx, data]);

  // Keep stateInput in sync whenever data changes
  useEffect(() => {
    const s = dataToStateStr(data);
    setStateInput(s.includes('·') ? s.replace(/·/g, '') : s);
  }, [data]);

  // ── Notifications ─────────────────────────────────────────────────────
  const triggerNotification = (msg: string) => {
    setNote(msg);
    if (msg) setTimeout(() => setNote(''), 4000);
  };

  // ── Web Worker (Blob-based to bypass Vite module issues) ─────────────
  const solverWorker = useRef<Worker | null>(null);
  const solverReady = useRef(false);
  const solveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let worker: Worker;
    fetch(cubeBundleUrl)
      .then(r => r.text())
      .then(bundleCode => {
        // Strip the ES module export — run as classic script in worker
        const classicCode = bundleCode.replace(/^export default __Cube;$/m, '');
        const workerSrc = classicCode + `
self.onmessage = function(e) {
  if (e.data.type === 'INIT') {
    try {
      __Cube.initSolver();
      self.postMessage({ type: 'INIT_DONE' });
    } catch(err) {
      self.postMessage({ type: 'ERROR', error: 'Init failed: ' + err.message });
    }
  } else if (e.data.type === 'SOLVE') {
    try {
      var cube = __Cube.fromString(e.data.stateStr);
      var solution = cube.solve();
      self.postMessage({ type: 'SOLUTION', solution: solution });
    } catch(err) {
      self.postMessage({ type: 'ERROR', error: err.message || 'Solve failed' });
    }
  }
};
`;
        const blob = new Blob([workerSrc], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
        solverWorker.current = worker;

        worker.onmessage = (e) => {
          const { type, solution: sol, error } = e.data;
          if (type === 'INIT_DONE') {
            solverReady.current = true;
            console.log('[solver] Ready ✓');
          } else if (type === 'SOLUTION') {
            if (solveTimeout.current) { clearTimeout(solveTimeout.current); solveTimeout.current = null; }
            setSolution(sol ?? '');
            setNote('');
            setIsSolving(false);
          } else if (type === 'ERROR') {
            if (solveTimeout.current) { clearTimeout(solveTimeout.current); solveTimeout.current = null; }
            console.error('[solver]', error);
            triggerNotification(`Solver error: ${error}`);
            setIsSolving(false);
          }
        };

        worker.onerror = (e) => {
          console.error('[solver worker crash]', e);
          triggerNotification(`Worker crashed: ${e.message ?? 'unknown'}`);
          setIsSolving(false);
        };

        // Kick off initSolver in background
        worker.postMessage({ type: 'INIT' });
      })
      .catch(err => {
        console.error('[solver] Failed to load bundle:', err);
        triggerNotification('Failed to load solver.');
      });

    return () => { worker?.terminate(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const f = FACES[curFaceIdx];

  const handleTabSwitch = (t: 'upload' | 'camera' | 'manual') => setTab(t);
  const handleToggleDebug = () => setShowHsv(v => !v);
  const handleToggleAbout = () => setIsAboutOpen(v => !v);
  const handleJumpToFace = (idx: number) => { setCurFaceIdx(idx); setImageSrc(null); };

  /** Called when a face is confirmed (from any tab) */
  const handleConfirmFace = (colors: string[]) => {
    setData(prev => ({ ...prev, [f.id]: colors }));
    if (curFaceIdx < 5) { setCurFaceIdx(curFaceIdx + 1); setImageSrc(null); }
  };

  /** Called live from ManualTab as user paints cells */
  const handleUpdateManColors = (fid: FaceId, colors: (string | null)[]) => {
    // If all cells filled, write directly into data so visuals sync immediately
    if (colors.every(c => c !== null)) {
      setData(prev => ({ ...prev, [fid]: colors as string[] }));
    }
  };

  /** Handle direct edits to the state string input */
  const handleStateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setStateInput(val);
    const parsed = stateStrToData(val);
    if (parsed) setData(parsed);
  };

  /** Solve the cube */
  const doSolve = () => {
    const stateStr = dataToStateStr(data);
    if (stateStr.includes('·') || stateStr.includes('?')) {
      triggerNotification('Fill all 6 faces first.'); return;
    }
    // Validate before sending — invalid states cause the solver to hang forever
    const validationError = validateStateStr(stateStr);
    if (validationError) {
      triggerNotification(`Invalid state: ${validationError}`); return;
    }
    if (!solverReady.current) {
      triggerNotification('Solver still initializing, try again shortly.'); return;
    }

    // Instantly handle an already-solved cube
    if (stateStr === 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB') {
      setSolution('Already Solved!');
      return;
    }

    console.log('[solver] Sending state:', stateStr);
    setIsSolving(true);

    // Safety timeout — abort if solver doesn't respond within 20s
    solveTimeout.current = setTimeout(() => {
      setIsSolving(false);
      triggerNotification('Solver timed out — cube state may be unsolvable.');
    }, 20000);

    solverWorker.current?.postMessage({ type: 'SOLVE', stateStr });
  };

  /** Reset all cube state */
  const handleClearAll = () => {
    setData(EMPTY_DATA);
    setCurFaceIdx(0);
    setImageSrc(null);
    setSolution(null);
    triggerNotification('All inputs cleared.');
  };

  const allFacesDone = Object.values(data).every(Boolean);
  const stepSubText = `Point the ${f.name.toLowerCase()} center face at the camera. ${TOP_HINT[f.id] || ''}`;

  return (
    <>
      <Header showHsv={showHsv} onToggleDebug={handleToggleDebug} onToggleAbout={handleToggleAbout} />

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

          <div>
            <div className="progress-label">
              Progress
            </div>
            <CubeNet curFaceIdx={curFaceIdx} data={data} onJumpToFace={handleJumpToFace} />
          </div>

          <div className="tabs">
            <button className={`tab ${tab === 'upload' ? 'on' : ''}`} onClick={() => handleTabSwitch('upload')}>Upload</button>
            {isMobile && (
              <button className={`tab ${tab === 'camera' ? 'on' : ''}`} onClick={() => handleTabSwitch('camera')} id="camTab">Camera</button>
            )}
            <button className={`tab ${tab === 'manual' ? 'on' : ''}`} onClick={() => handleTabSwitch('manual')}>Manual</button>
          </div>

          <div className="card">
            {tab === 'upload' && (
              <UploadTab curFaceIdx={curFaceIdx} imageSrc={imageSrc} setImageSrc={setImageSrc} showHsv={showHsv} onConfirmFace={handleConfirmFace} />
            )}
            {tab === 'camera' && (
              <CameraTab onFrameCaptured={(src) => { setImageSrc(src); setTab('upload'); }} />
            )}
            {tab === 'manual' && (
              <ManualTab
                curFaceIdx={curFaceIdx}
                // Pass current confirmed colors so ManualTab can pre-populate
                initialColors={data[f.id] ?? null}
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
            <FaceList curFaceIdx={curFaceIdx} data={data} onJumpToFace={handleJumpToFace} />
          </div>

          <div>
            <div className="plabel">State string (54 chars)</div>
            <input
              id="stateInput"
              className={`state-input${stateInput.length === 54 ? ' valid' : ''}`}
              type="text"
              value={stateInput}
              onChange={handleStateInput}
              maxLength={54}
              placeholder="UUUUUUUUURRR…"
              spellCheck={false}
            />
            <div className="state-input-hint">
              {stateInput.length}/54 — paste or type to load a state
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-g clear-btn"
              onClick={handleClearAll}
            >
              Clear All Inputs
            </button>
            <button
              className={`solve-btn${isSolving ? ' loading' : ''}`}
              id="solveBtn"
              disabled={!allFacesDone || isSolving}
              onClick={doSolve}
            >
              {isSolving ? (
                <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Solving…</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg> Solve cube</>
              )}
            </button>
            <div className="snote" id="snote">{note}</div>
          </div>
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={handleToggleAbout} />
      <SolutionModal 
        isOpen={solution !== null} 
        solution={solution ?? ''} 
        initialStateStr={dataToStateStr(data)}
        onClose={() => setSolution(null)} 
      />
    </>
  );
};
