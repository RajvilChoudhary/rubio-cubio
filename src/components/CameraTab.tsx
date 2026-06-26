import React, { useState, useRef, useEffect } from 'react';

interface CameraTabProps {
  onFrameCaptured: (dataUrl: string) => void;
}

export const CameraTab: React.FC<CameraTabProps> = ({ onFrameCaptured }) => {
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = 'block';
      }
      setIsActive(true);
    } catch (e) {
      alert('Camera access denied. Use Upload or Manual instead.');
    }
  };

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.style.display = 'none';
    }
    setIsActive(false);
  };

  const capFrame = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      stopCam();
      onFrameCaptured(dataUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div id="t-camera">
      <div className="cam-wrap">
        <div className="cam-box" id="camBox">
          <video
            ref={videoRef}
            id="vid"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }}
            playsInline
            autoPlay
          />
          <div className="cam-grid" id="camGrid" style={{ display: isActive ? 'grid' : 'none' }}>
            <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <div className="cam-ph" id="camPh" style={{ display: isActive ? 'none' : 'flex' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Enable camera</span>
          </div>
        </div>
      </div>
      <div className="actions">
        {!isActive ? (
          <button className="btn btn-p" id="startCamBtn" onClick={startCam}>
            Start camera
          </button>
        ) : (
          <>
            <button className="btn btn-p" id="capBtn" onClick={capFrame}>
              Capture
            </button>
            <button className="btn btn-g" id="stopCamBtn" onClick={stopCam}>
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
};
