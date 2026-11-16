import { PixelBuffer, type RGBAColor } from './bitmap';
import { type FontPreset, FONT_PRESETS } from './fonts';
import { parseLatex } from './parser';
import { LayoutEngine } from './layout';
import type { Box } from './types';
import { encodePng, pngToDataUrl } from './png';

export interface RenderOptions {
  presetId?: 'compact' | 'standard' | 'large';
  padding?: number; // padding in pixels around expression (default 2)
  fgColor?: RGBAColor;
  bgColor?: RGBAColor;
}

export interface RenderResult {
  buffer: PixelBuffer;
  width: number;
  height: number;
  activePixels: number;
  box: Box;
  pngBytes: Uint8Array;
  dataUrl: string;
}

export class PixelMathRenderer {
  public static render(latex: string, options: RenderOptions = {}): RenderResult {
    const presetId = options.presetId || 'standard';
    const preset: FontPreset = FONT_PRESETS[presetId] || FONT_PRESETS.standard;
    const padding = options.padding !== undefined ? Math.max(0, options.padding) : 2;

    const fgColor = options.fgColor || { r: 255, g: 255, b: 255, a: 255 }; // Pure white default or black
    const bgColor = options.bgColor;

    // 1. Parse LaTeX into AST
    const ast = parseLatex(latex);

    // 2. Recursive TeX box model layout
    const layoutEngine = new LayoutEngine(preset);
    const box = layoutEngine.layout(ast);

    // 3. Dynamic sizing canvas
    const rawW = Math.max(1, box.width);
    const rawH = Math.max(1, box.totalHeight);
    const rawBuffer = new PixelBuffer(rawW, rawH);

    // Baseline is at box.height
    box.render(rawBuffer, 0, box.height);

    // 4. Pad or format with padding
    const paddedBuffer = padding > 0 ? rawBuffer.pad(padding) : rawBuffer;

    // 5. Generate strict 1-bit PNG
    const pngBytes = encodePng(paddedBuffer, fgColor, bgColor);
    const dataUrl = pngToDataUrl(pngBytes);

    return {
      buffer: paddedBuffer,
      width: paddedBuffer.width,
      height: paddedBuffer.height,
      activePixels: paddedBuffer.countActivePixels(),
      box,
      pngBytes,
      dataUrl,
    };
  }
}
