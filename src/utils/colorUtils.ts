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
  // Hue distance (0 to 1)
  let dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180;
  
  // If either color is very unsaturated (like white/grey), hue means very little.
  // Scale the hue difference by the average saturation.
  const avgS = (s1 + s2) / 2;
  
  // Weights for HSV components. Hue is weighted heavily when saturated, but drops to 0 when unsaturated.
  const hueWeight = 6.0 * avgS; 
  const satWeight = 2.0;
  const valWeight = 1.0;

  return Math.sqrt(
    (dh * hueWeight) ** 2 + 
    ((s1 - s2) * satWeight) ** 2 + 
    ((v1 - v2) * valWeight) ** 2
  );
}

// Calibrated real-world webcam HSV averages, corresponding to the FACES array order:
// [White, Red, Green, Yellow, Orange, Blue]
export const CENTER_HSV: [number, number, number][] = [
  [0, 0.00, 0.80],   // White: Saturation is the only thing that matters
  [0, 0.75, 0.70],   // Red: Hue ~0
  [130, 0.70, 0.60], // Green: Hue ~130
  [45, 0.80, 0.85],  // Yellow: Hue ~45
  [18, 0.85, 0.85],  // Orange: Hue ~18
  [215, 0.75, 0.60]  // Blue: Hue ~215
];
