import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Cube3DViewerProps {
  stateStr: string;
  solution: string;
}

const FACE_COLORS: Record<string, number> = {
  U: 0xFFFFFF,
  R: 0xFF4444,
  F: 0x22C55E,
  D: 0xFFD700,
  L: 0xFF8C00,
  B: 0x3B82F6,
};

function getFaceletInfo(index: number): { pos: [number, number, number]; normal: [number, number, number] } {
  const face = Math.floor(index / 9);
  const offset = index % 9;
  const r = Math.floor(offset / 3);
  const c = offset % 3;

  switch (face) {
    case 0: // U
      return { pos: [c - 1, 1, r - 1], normal: [0, 1, 0] };
    case 1: // R
      return { pos: [1, 1 - r, 1 - c], normal: [1, 0, 0] };
    case 2: // F
      return { pos: [c - 1, 1 - r, 1], normal: [0, 0, 1] };
    case 3: // D
      return { pos: [c - 1, -1, 1 - r], normal: [0, -1, 0] };
    case 4: // L
      return { pos: [-1, 1 - r, c - 1], normal: [-1, 0, 0] };
    case 5: // B
      return { pos: [1 - c, 1 - r, -1], normal: [0, 0, -1] };
    default:
      return { pos: [0, 0, 0], normal: [0, 0, 0] };
  }
}

export const Cube3DViewer: React.FC<Cube3DViewerProps> = ({ stateStr, solution }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentMove, setCurrentMove] = useState(-1);
  const moves = solution.trim().split(/\s+/).filter(Boolean);

  const cubeGroup = useRef<THREE.Group | null>(null);
  const cubies = useRef<THREE.Mesh[]>([]);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const getHeight = () => Math.min(320, Math.max(220, mount.clientWidth * 0.85));
    let width = mount.clientWidth;
    let height = getHeight();

    const scene = new THREE.Scene();
    scene.background = null; // transparent

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 4, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = 15;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const group = new THREE.Group();
    scene.add(group);
    cubeGroup.current = group;
    cubies.current = []; // Clear old references on re-render

    // Build the 26 cubies
    const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          // Create a material array with 6 sides
          const materials = [
            baseMaterial.clone(), // right (x=1)
            baseMaterial.clone(), // left (x=-1)
            baseMaterial.clone(), // top (y=1)
            baseMaterial.clone(), // bottom (y=-1)
            baseMaterial.clone(), // front (z=1)
            baseMaterial.clone(), // back (z=-1)
          ];

          const mesh = new THREE.Mesh(geometry, materials);
          mesh.position.set(x, y, z);
          mesh.userData = { initialPos: new THREE.Vector3(x, y, z) };
          group.add(mesh);
          cubies.current.push(mesh);
        }
      }
    }

    // Apply colors based on stateStr
    if (stateStr.length === 54) {
      for (let i = 0; i < 54; i++) {
        const char = stateStr[i];
        const colorHex = FACE_COLORS[char] ?? 0x555555;
        const info = getFaceletInfo(i);
        
        // Find the cubie at info.pos
        const targetCubie = cubies.current.find(c => {
          const p = c.position;
          return Math.abs(p.x - info.pos[0]) < 0.1 && 
                 Math.abs(p.y - info.pos[1]) < 0.1 && 
                 Math.abs(p.z - info.pos[2]) < 0.1;
        });

        if (targetCubie) {
          const mats = targetCubie.material as THREE.MeshPhongMaterial[];
          const nx = info.normal[0], ny = info.normal[1], nz = info.normal[2];
          let matIndex = -1;
          if (nx === 1) matIndex = 0;
          else if (nx === -1) matIndex = 1;
          else if (ny === 1) matIndex = 2;
          else if (ny === -1) matIndex = 3;
          else if (nz === 1) matIndex = 4;
          else if (nz === -1) matIndex = 5;

          if (matIndex !== -1) {
            mats[matIndex].color.setHex(colorHex);
            mats[matIndex].needsUpdate = true;
          }
        }
      }
    } else {
      console.error('[3D] Invalid stateStr length:', stateStr.length);
    }

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      width = mount.clientWidth;
      height = getHeight();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [stateStr]); // Re-init geometry only if state changes

  const animateMove = (move: string, reverse: boolean) => {
    if (!cubeGroup.current) return Promise.resolve();
    isAnimating.current = true;

    return new Promise<void>(resolve => {
      const face = move[0];
      const isPrime = move.includes("'");
      const isDouble = move.includes('2');
      
      let angle = Math.PI / 2;
      if (isDouble) angle = Math.PI;

      const group = cubeGroup.current;
      if (!group) {
        isAnimating.current = false;
        resolve();
        return;
      }

      const frames = 15; // Animation duration in frames
      let currentFrame = 0;

      let axis = new THREE.Vector3();
      let layerCubies: THREE.Mesh[] = [];

      cubies.current.forEach(c => {
        // Find cubies in the rotating layer based on their current world position
        const p = new THREE.Vector3();
        c.getWorldPosition(p);
        
        const eps = 0.5;
        let inLayer = false;
        if (face === 'U' && p.y > eps) { axis.set(0, 1, 0); inLayer = true; }
        else if (face === 'D' && p.y < -eps) { axis.set(0, 1, 0); inLayer = true; }
        else if (face === 'R' && p.x > eps) { axis.set(1, 0, 0); inLayer = true; }
        else if (face === 'L' && p.x < -eps) { axis.set(1, 0, 0); inLayer = true; }
        else if (face === 'F' && p.z > eps) { axis.set(0, 0, 1); inLayer = true; }
        else if (face === 'B' && p.z < -eps) { axis.set(0, 0, 1); inLayer = true; }

        if (inLayer) layerCubies.push(c);
      });

      // Correct the direction based on standard notation rules
      if (face === 'D' || face === 'L' || face === 'B') axis.negate();
      const actualTargetAngle = angle * (isPrime ? 1 : -1) * (reverse ? -1 : 1);

      // Create a pivot object
      const pivot = new THREE.Group();
      group.add(pivot);
      
      layerCubies.forEach(c => {
        group.remove(c);
        pivot.add(c);
      });

      const tick = () => {
        currentFrame++;
        const progress = currentFrame / frames;
        // Ease in-out sine
        const ease = -(Math.cos(Math.PI * progress) - 1) / 2;
        pivot.setRotationFromAxisAngle(axis, actualTargetAngle * ease);

        if (currentFrame < frames) {
          requestAnimationFrame(tick);
        } else {
          // Finalize rotation
          pivot.updateMatrixWorld();
          layerCubies.forEach(c => {
            c.applyMatrix4(pivot.matrix);
            pivot.remove(c);
            group.add(c);
          });
          group.remove(pivot);
          isAnimating.current = false;
          resolve();
        }
      };
      tick();
    });
  };

  const handleNext = async () => {
    if (isAnimating.current || currentMove >= moves.length - 1) return;
    const nextIdx = currentMove + 1;
    await animateMove(moves[nextIdx], false);
    setCurrentMove(nextIdx);
  };

  const handlePrev = async () => {
    if (isAnimating.current || currentMove < 0) return;
    await animateMove(moves[currentMove], true);
    setCurrentMove(currentMove - 1);
  };

  return (
    <div className="cube3d-viewer">
      <div ref={mountRef} className="cube3d-canvas" />
      <div className="cube3d-controls">
        <button 
          className="btn btn-g" 
          onClick={handlePrev} 
          disabled={currentMove < 0 || isAnimating.current}
        >
          Previous
        </button>
        <div className="cube3d-move-count">
          Move {currentMove + 1} / {moves.length}
        </div>
        <button 
          className="btn btn-p" 
          onClick={handleNext} 
          disabled={currentMove >= moves.length - 1 || isAnimating.current}
        >
          Next Move
        </button>
      </div>
      <div className="cube3d-hint">
        Drag to rotate the cube • Scroll to zoom
      </div>
    </div>
  );
};
