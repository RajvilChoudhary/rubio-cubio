export type FaceId = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export interface Face {
  id: FaceId;
  name: string;
  hex: string;
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedData {
  colors: string[];
  raw: [number, number, number][];
  hsv: [number, number, number][];
}
