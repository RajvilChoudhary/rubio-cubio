import React, { useState, useRef, useEffect } from 'react';
import { FACES, TOP_HINT, FACE_ADJACENCY } from '../constants';
import type { CropBox, ExtractedData } from '../types';
import { rgbHsv, hsvDist, CENTER_HSV } from '../utils/colorUtils';

interface UploadTabProps {
  curFaceIdx: number;
  imageSrc: string | null;
  setImageSrc: (src: string | null) => void;
  showHsv: boolean;
  onConfirmFace: (colors: string[]) => void;
}

interface ImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  curFaceIdx,
  imageSrc,
  setImageSrc,
  showHsv,
  onConfirmFace
}) => {
  const f = FACES[curFaceIdx];

  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [rot, setRot] = useState<number>(0);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [procMsg, setProcMsg] = useState('Extracting…');
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editCell, setEditCell] = useState<number | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const editorAreaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    startCrop: CropBox;
  } | null>(null);

  // Initialize and run extraction
  const handleImageLoad = () => {
    if (!imgRef.current || !editorAreaRef.current) return;
    const img = imgRef.current;
    const ed = editorAreaRef.current;

    const ew = ed.offsetWidth;
    const ih = img.naturalHeight;
    const iw = img.naturalWidth;

    const maxH = 480;
    const aspect = iw / ih;
    let dispW = ew;
    let dispH = ew / aspect;

    if (dispH > maxH) {
      dispH = maxH;
      dispW = maxH * aspect;
    }

    const ox = (ew - dispW) / 2;
    const oy = 0; // because container height will match dispH

    const newMetrics = {
      naturalWidth: iw,
      naturalHeight: ih,
      displayWidth: dispW,
      displayHeight: dispH,
      offsetX: ox,
      offsetY: oy
    };
    setMetrics(newMetrics);

    const margin = 0.18;
    const size = Math.min(dispW, dispH) * (1 - 2 * margin);
    const initialCrop = {
      x: ox + dispW / 2 - size / 2,
      y: oy + dispH / 2 - size / 2,
      w: size,
      h: size
    };
    setCrop(initialCrop);
  };

  // Run extraction whenever crop changes or rotation changes
  const runExtract = async () => {
    if (!imgRef.current || !canvasRef.current || !metrics) return;

    setIsExtracting(true);
    setProcMsg('Extracting…');
    setExtracted(null);

    // Short timeout to allow loader UI to show
    await new Promise(r => setTimeout(r, 60));

    try {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nw = metrics.naturalWidth;
      const nh = metrics.naturalHeight;

      if (rot === 0 || rot === 180) {
        canvas.width = nw;
        canvas.height = nh;
      } else {
        canvas.width = nh;
        canvas.height = nw;
      }

      ctx.save();
      if (rot === 0) {
        ctx.drawImage(img, 0, 0, nw, nh);
      } else if (rot === 90) {
        ctx.translate(nh, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0, nw, nh);
      } else if (rot === 180) {
        ctx.translate(nw, nh);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, 0, 0, nw, nh);
      } else if (rot === 270) {
        ctx.translate(0, nw);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, 0, 0, nw, nh);
      }
      ctx.restore();

      const cw = canvas.width;
      const ch = canvas.height;

      const { x: cx, y: cy, w: cw2, h: ch2 } = crop;
      const ox = metrics.offsetX;
      const oy = metrics.offsetY;

      // Crop relative to image display (remove offset)
      const relX = (cx - ox) / metrics.displayWidth;
      const relY = (cy - oy) / metrics.displayHeight;
      const relW = cw2 / metrics.displayWidth;
      const relH = ch2 / metrics.displayHeight;

      // Map relative coordinates through rotation into canvas coordinates
      let gx = 0, gy = 0, gw = 0, gh = 0;
      if (rot === 0) {
        gx = relX * cw; gy = relY * ch; gw = relW * cw; gh = relH * ch;
      } else if (rot === 90) {
        gx = (1 - relY - relH) * cw; gy = relX * ch; gw = relH * cw; gh = relW * ch;
      } else if (rot === 180) {
        gx = (1 - relX - relW) * cw; gy = (1 - relY - relH) * ch; gw = relW * cw; gh = relH * ch;
      } else if (rot === 270) {
        gx = relY * cw; gy = (1 - relX - relW) * ch; gw = relH * cw; gh = relW * ch;
      }

      const cellW = gw / 3;
      const cellH = gh / 3;
      const PATCH = 9;
      const half = Math.floor(PATCH / 2);
      const raw9: [number, number, number][] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const pcx = Math.round(gx + col * cellW + cellW / 2);
          const pcy = Math.round(gy + row * cellH + cellH / 2);
          let rs = 0, gs = 0, bs = 0, cnt = 0;

          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              const px = Math.min(Math.max(pcx + dx, 0), cw - 1);
              const py = Math.min(Math.max(pcy + dy, 0), ch - 1);
              const d = ctx.getImageData(px, py, 1, 1).data;
              rs += d[0];
              gs += d[1];
              bs += d[2];
              cnt++;
            }
          }
          raw9.push([rs / cnt, gs / cnt, bs / cnt]);
        }
      }

      setProcMsg('Classifying colors…');
      await new Promise(r => setTimeout(r, 40));

      const hsv9 = raw9.map(([r, g, b]) => rgbHsv(r, g, b));
      const colors = hsv9.map((hsv) => {
        let best = 0;
        let bd = Infinity;
        CENTER_HSV.forEach((c, i) => {
          const d = hsvDist(hsv, c);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        return FACES[best].hex;
      });

      // Force center sticker to match face identity
      colors[4] = FACES[curFaceIdx].hex;

      setExtracted({ colors, raw: raw9, hsv: hsv9 });
      setIsExtracting(false);
    } catch (err) {
      setIsExtracting(false);
      setProcMsg('Error — try again');
      console.error(err);
    }
  };

  // Run extract automatically when crop is set and image metrics are available
  useEffect(() => {
    if (metrics && crop.w > 0 && !extracted && !isExtracting) {
      runExtract();
    }
  }, [metrics, crop, rot]);

  // Handle Dragging
  const handleDragStart = (type: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editorAreaRef.current) return;
    const rect = editorAreaRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      type,
      startX: clientX - rect.left,
      startY: clientY - rect.top,
      startCrop: crop
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !editorAreaRef.current) return;
      e.preventDefault();

      const rect = editorAreaRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const dx = x - dragRef.current.startX;
      const dy = y - dragRef.current.startY;
      const sc = dragRef.current.startCrop;
      const t = dragRef.current.type;
      const MIN = 60;
      const ew = editorAreaRef.current.offsetWidth;
      const eh = editorAreaRef.current.offsetHeight;

      const nextCrop = { ...sc };

      if (t === 'move') {
        nextCrop.x = sc.x + dx;
        nextCrop.y = sc.y + dy;
      } else if (t === 'tl') {
        nextCrop.x = sc.x + dx;
        nextCrop.y = sc.y + dy;
        nextCrop.w = Math.max(MIN, sc.w - dx);
        nextCrop.h = Math.max(MIN, sc.h - dy);
        if (nextCrop.w === MIN) nextCrop.x = sc.x + sc.w - MIN;
        if (nextCrop.h === MIN) nextCrop.y = sc.y + sc.h - MIN;
      } else if (t === 'tr') {
        nextCrop.y = sc.y + dy;
        nextCrop.w = Math.max(MIN, sc.w + dx);
        nextCrop.h = Math.max(MIN, sc.h - dy);
        if (nextCrop.h === MIN) nextCrop.y = sc.y + sc.h - MIN;
      } else if (t === 'bl') {
        nextCrop.x = sc.x + dx;
        nextCrop.w = Math.max(MIN, sc.w - dx);
        nextCrop.h = Math.max(MIN, sc.h + dy);
        if (nextCrop.w === MIN) nextCrop.x = sc.x + sc.w - MIN;
      } else if (t === 'br') {
        nextCrop.w = Math.max(MIN, sc.w + dx);
        nextCrop.h = Math.max(MIN, sc.h + dy);
      } else if (t === 't') {
        nextCrop.y = sc.y + dy;
        nextCrop.h = Math.max(MIN, sc.h - dy);
        if (nextCrop.h === MIN) nextCrop.y = sc.y + sc.h - MIN;
      } else if (t === 'b') {
        nextCrop.h = Math.max(MIN, sc.h + dy);
      } else if (t === 'l') {
        nextCrop.x = sc.x + dx;
        nextCrop.w = Math.max(MIN, sc.w - dx);
        if (nextCrop.w === MIN) nextCrop.x = sc.x + sc.w - MIN;
      } else if (t === 'r') {
        nextCrop.w = Math.max(MIN, sc.w + dx);
      }

      // Clamp crop box bounds
      nextCrop.w = Math.max(MIN, Math.min(nextCrop.w, ew));
      nextCrop.h = Math.max(MIN, Math.min(nextCrop.h, eh));
      nextCrop.x = Math.max(0, Math.min(nextCrop.x, ew - nextCrop.w));
      nextCrop.y = Math.max(0, Math.min(nextCrop.y, eh - nextCrop.h));

      setCrop(nextCrop);
    };

    const handleEnd = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [crop]);

  // Dropzone Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setImageSrc(ev.target.result as string);
        setRot(0);
        setExtracted(null);
        setMetrics(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImageSrc(null);
    setExtracted(null);
    setMetrics(null);
    setRot(0);
  };

  const handleConfirmColors = () => {
    if (extracted) {
      onConfirmFace(extracted.colors);
    }
  };

  const handleOverrideColor = (cellIdx: number, hex: string) => {
    if (!extracted) return;
    const newColors = [...extracted.colors];
    newColors[cellIdx] = hex;
    setExtracted({ ...extracted, colors: newColors });
    setEditCell(null);
  };

  return (
    <div id="t-upload">
      {!imageSrc ? (
        <div id="dzWrap">
          {/* Orientation diagram */}
          <div className="orient-guide">
            <div className="og-title">Hold cube so <strong style={{color: f.hex}}>{f.name}</strong> face points at camera</div>
            {(() => {
              const adj = FACE_ADJACENCY[f.id];
              const getFace = (id: string) => FACES.find(x => x.id === id)!;
              const top = getFace(adj.top);
              const bottom = getFace(adj.bottom);
              const left = getFace(adj.left);
              const right = getFace(adj.right);
              const swatch = (face: typeof FACES[0]) => (
                <div className="og-swatch" style={{borderColor: face.hex + '88', background: face.hex + '18'}}>
                  <span className="og-swatch-dot" style={{background: face.hex}} />
                  <span className="og-swatch-name">{face.name}</span>
                </div>
              );
              return (
                <div className="og-cross">
                  <div className="og-cross-top">{swatch(top)}</div>
                  <div className="og-cross-mid">
                    {swatch(left)}
                    <div className="og-face-main" style={{borderColor: f.hex, background: f.hex + '18'}}>
                      <div className="og-face-grid">
                        {Array(9).fill(null).map((_, i) => (
                          <div key={i} style={{background: i === 4 ? f.hex : f.hex + '50', borderRadius: '2px'}} />
                        ))}
                      </div>
                    </div>
                    {swatch(right)}
                  </div>
                  <div className="og-cross-btm">{swatch(bottom)}</div>
                </div>
              );
            })()}
          </div>
          <div
            className={`dropzone ${dragOver ? 'drag' : ''}`}
            id="dz"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" id="fileIn" onChange={handleFileChange} />
            <div className="dz-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="dz-text">Drop image or click to browse</div>
            <div className="dz-hint">JPG · PNG · WEBP</div>
          </div>
        </div>
      ) : (
        <div id="editorWrap">
          <div
            className="editor-wrap"
            id="editorArea"
            ref={editorAreaRef}
            style={{ height: metrics ? `${metrics.displayHeight}px` : 'auto' }}
          >
            <img
              ref={imgRef}
              id="edImg"
              className="editor-img"
              alt=""
              src={imageSrc}
              draggable="false"
              onLoad={handleImageLoad}
              style={{ transform: `rotate(${rot}deg)` }}
            />

            {/* dim overlays */}
            <div className="dim-top" style={{ left: 0, right: 0, top: 0, height: `${crop.y}px` }} />
            <div className="dim-bottom" style={{ left: 0, right: 0, bottom: 0, top: `${crop.y + crop.h}px` }} />
            <div className="dim-left" style={{ top: `${crop.y}px`, height: `${crop.h}px`, left: 0, width: `${crop.x}px` }} />
            <div className="dim-right" style={{ top: `${crop.y}px`, height: `${crop.h}px`, right: 0, left: `${crop.x + crop.w}px` }} />

            {/* crop box */}
            <div
              className="crop-box"
              style={{
                left: `${crop.x}px`,
                top: `${crop.y}px`,
                width: `${crop.w}px`,
                height: `${crop.h}px`
              }}
              onMouseDown={handleDragStart('move')}
              onTouchStart={handleDragStart('move')}
            >
              <div className="crop-grid">
                <div className="cg-v1"></div>
                <div className="cg-v2"></div>
                <div className="cg-h1"></div>
                <div className="cg-h2"></div>
              </div>
              <div className="handle tl" onMouseDown={handleDragStart('tl')} onTouchStart={handleDragStart('tl')}></div>
              <div className="handle tr" onMouseDown={handleDragStart('tr')} onTouchStart={handleDragStart('tr')}></div>
              <div className="handle bl" onMouseDown={handleDragStart('bl')} onTouchStart={handleDragStart('bl')}></div>
              <div className="handle br" onMouseDown={handleDragStart('br')} onTouchStart={handleDragStart('br')}></div>
              <div className="edge-handle eh-t" onMouseDown={handleDragStart('t')} onTouchStart={handleDragStart('t')}></div>
              <div className="edge-handle eh-b" onMouseDown={handleDragStart('b')} onTouchStart={handleDragStart('b')}></div>
              <div className="edge-handle eh-l" onMouseDown={handleDragStart('l')} onTouchStart={handleDragStart('l')}></div>
              <div className="edge-handle eh-r" onMouseDown={handleDragStart('r')} onTouchStart={handleDragStart('r')}></div>
            </div>

            {/* sample dots */}
            {metrics && crop.w > 0 && Array(9).fill(null).map((_, idx) => {
              const r = Math.floor(idx / 3);
              const c = idx % 3;
              const px = crop.x + (c + 0.5) * crop.w / 3;
              const py = crop.y + (r + 0.5) * crop.h / 3;
              const color = extracted ? extracted.colors[idx] : 'rgba(255,230,0,0.9)';
              return (
                <div
                  key={idx}
                  className="sdot"
                  style={{
                    left: `${px}px`,
                    top: `${py}px`,
                    background: color
                  }}
                />
              );
            })}

            {/* proc overlay */}
            <div className={`proc ${isExtracting ? 'on' : ''}`} id="proc">
              <div className="spinner"></div>
              <div className="proc-msg" id="procMsg">{procMsg}</div>
            </div>
          </div>

          {/* orientation */}
          <div className="orient-bar">
            <span className="olabel">Rotate</span>
            <div className="orow">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  className={`obtn ${rot === deg ? 'on' : ''}`}
                  onClick={() => {
                    setRot(deg);
                    setExtracted(null);
                    // Force recrop center
                    if (metrics) {
                      const size = Math.min(metrics.displayWidth, metrics.displayHeight) * (1 - 2 * 0.18);
                      setCrop({
                        x: metrics.offsetX + metrics.displayWidth / 2 - size / 2,
                        y: metrics.offsetY + metrics.displayHeight / 2 - size / 2,
                        w: size,
                        h: size
                      });
                    }
                  }}
                  title={deg === 0 ? '0°' : deg === 90 ? '90° CW' : deg === 180 ? '180°' : '90° CCW'}
                >
                  {deg === 0 ? '↑' : deg === 90 ? '→' : deg === 180 ? '↓' : '←'}
                </button>
              ))}
            </div>
            <span className="oref" id="oref">{TOP_HINT[f.id] || ''}</span>
          </div>

          {/* extracted result */}
          {extracted && (
            <div className="ext-wrap" id="extWrap" style={{ display: 'flex' }}>
              <div className="ext-label">Detected colors — <span style={{color:'var(--text)'}}>click any cell to fix</span></div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <div className="ext-grid" id="extGrid">
                    {extracted.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className={`ext-cell ext-cell-btn ${editCell === idx ? 'ext-cell-active' : ''}`}
                        title={idx === 4 ? 'Center sticker (locked)' : 'Click to override color'}
                        style={{
                          background: color,
                          border: editCell === idx ? '2px solid #fff' : (color === '#FFFFFF' || color === '#FFD700' ? '1.5px solid #444' : '1.5px solid transparent'),
                          cursor: idx === 4 ? 'not-allowed' : 'pointer',
                          opacity: idx === 4 ? 0.75 : 1
                        }}
                        onClick={() => idx !== 4 && setEditCell(editCell === idx ? null : idx)}
                      />
                    ))}
                  </div>
                  {/* inline color picker */}
                  {editCell !== null && (
                    <div className="ext-picker">
                      <div style={{fontSize:'8px', color:'var(--muted)', marginBottom:'5px', letterSpacing:'0.08em'}}>PICK COLOR FOR CELL {editCell + 1}</div>
                      <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                        {FACES.map(face => (
                          <div
                            key={face.id}
                            onClick={() => handleOverrideColor(editCell, face.hex)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px',
                              background: face.hex, cursor: 'pointer',
                              border: extracted.colors[editCell] === face.hex ? '2px solid #fff' : (face.hex === '#FFFFFF' || face.hex === '#FFD700' ? '1.5px solid #555' : '2px solid transparent'),
                              transition: 'transform 0.1s'
                            }}
                            title={face.name}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setEditCell(null)}
                        style={{marginTop:'6px', fontSize:'9px', background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:0}}
                      >✕ cancel</button>
                    </div>
                  )}
                </div>
                {showHsv && (
                  <div id="hsvPanel" style={{ fontSize: '9px', color: 'var(--muted)', lineHeight: '1.9', display: 'block' }}>
                    <div style={{ fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '3px' }}>HSV</div>
                    {extracted.hsv.map(([h, s, v], idx) => {
                      const color = extracted.colors[idx];
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <span style={{ width:'8px', height:'8px', borderRadius:'2px', background:color, display:'inline-block', flexShrink:0, border: color==='#FFFFFF'?'1px solid #444':undefined }} />
                          <span>{Math.round(h)}° {(s * 100).toFixed(0)}% {(v * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="actions">
            <button
              className="btn btn-p"
              onClick={handleConfirmColors}
              id="confirmBtn"
              disabled={!extracted}
            >
              Confirm colors
            </button>
            <button className="btn btn-g" onClick={runExtract}>Re-scan</button>
            <button className="btn btn-g" onClick={handleReset}>Change image</button>
          </div>
        </div>
      )}

      {/* hidden canvas for extraction */}
      <canvas ref={canvasRef} id="offscreen" style={{ display: 'none' }} />
    </div>
  );
};
