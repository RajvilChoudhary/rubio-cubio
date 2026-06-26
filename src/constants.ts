import type { Face, FaceId } from './types';

export const FACES: Face[] = [
  { id: 'U', name: 'White',  hex: '#FFFFFF' },
  { id: 'R', name: 'Red',    hex: '#FF4444' },
  { id: 'F', name: 'Green',  hex: '#22C55E' },
  { id: 'D', name: 'Yellow', hex: '#FFD700' },
  { id: 'L', name: 'Orange', hex: '#FF8C00' },
  { id: 'B', name: 'Blue',   hex: '#3B82F6' },
];

export const NET: (FaceId | null)[][] = [
  [null, 'U', null, null],
  ['L', 'F', 'R', 'B'],
  [null, 'D', null, null]
];

export const TOP_HINT: Record<FaceId, string> = {
  U: 'Blue on top',
  R: 'White on top',
  F: 'White on top',
  D: 'Green on top',
  L: 'White on top',
  B: 'White on top'
};

// Adjacent face IDs when looking straight at each face (top/bottom/left/right)
export const FACE_ADJACENCY: Record<FaceId, { top: FaceId; bottom: FaceId; left: FaceId; right: FaceId }> = {
  U: { top: 'B', bottom: 'F', left: 'L', right: 'R' },
  F: { top: 'U', bottom: 'D', left: 'L', right: 'R' },
  R: { top: 'U', bottom: 'D', left: 'F', right: 'B' },
  D: { top: 'F', bottom: 'B', left: 'L', right: 'R' },
  L: { top: 'U', bottom: 'D', left: 'B', right: 'F' },
  B: { top: 'U', bottom: 'D', left: 'R', right: 'L' },
};
