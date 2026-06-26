import { FACES } from '../constants';

export function hexRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function rgbHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    switch (mx) {
      case r: h = ((g - b) / d + 6) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, mx ? d / mx : 0, mx];
}

export function hexHsv(hex: string): [number, number, number] {
  return rgbHsv(...hexRgb(hex));
}

export function hsvDist(
  [h1, s1, v1]: [number, number, number],
  [h2, s2, v2]: [number, number, number]
): number {
  const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180;
  return Math.sqrt(dh * dh * 2 + (s1 - s2) ** 2 * 1.5 + (v1 - v2) ** 2);
}

export const CENTER_HSV = FACES.map(f => hexHsv(f.hex));
