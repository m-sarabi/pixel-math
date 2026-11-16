import type { GlyphData } from './font-interface';

export function makeGlyph(ascent: number, descent: number, pattern: string[]): GlyphData {
  const height = pattern.length;
  let width = 0;
  for (const row of pattern) {
    if (row.length > width) width = row.length;
  }

  // Normalize row strings to uniform width
  const normalizedRows = pattern.map(row => row.padEnd(width, '.'));

  return {
    width,
    height,
    ascent,
    descent,
    rows: normalizedRows,
  };
}
