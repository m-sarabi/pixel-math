export interface GlyphData {
  width: number;
  height: number;
  ascent: number;   // pixels above baseline
  descent: number;  // pixels below baseline (height = ascent + descent)
  rows: string[];   // array of strings where '#' or '1' is pixel, '.' or ' ' is blank
}

export interface FontMetrics {
  capHeight: number;
  xHeight: number;
  ascent: number;
  descent: number;
  mathAxis: number;      // Y position (from baseline, positive upwards) of fraction bar & math signs (+, =)
  ruleThickness: number; // fraction bar line thickness (1px)
  subscriptDrop: number; // distance below baseline for subscript
  superscriptRise: number;// distance above baseline for superscript
  charSpacing: number;   // default horizontal gap between letters (1px)
  operatorSpacing: number; // horizontal spacing around operators (+, =)
}

export interface BitmapFont {
  name: string;
  metrics: FontMetrics;
  getGlyph(charOrSymbol: string): GlyphData | undefined;
  hasGlyph(charOrSymbol: string): boolean;
}

export interface FontPreset {
  id: 'compact' | 'standard' | 'large';
  name: string;
  description: string;
  mainFont: BitmapFont;
  subFont: BitmapFont;
}
