import type { Box, MathNode, PixelTarget } from './types';
import type { BitmapFont, FontPreset, GlyphData } from './fonts';

// Simple Box implementations
export class GlyphBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private glyph: GlyphData;

  constructor(glyph: GlyphData) {
    this.glyph = glyph;
    this.width = glyph.width;
    this.height = glyph.ascent;
    this.depth = glyph.descent;
    this.totalHeight = glyph.height;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    // Top-left of glyph is at (x, y - height)
    const startY = y - this.height;
    const rows = this.glyph.rows;
    for (let r = 0; r < rows.length; r++) {
      const rowStr = rows[r];
      const targetY = startY + r;
      for (let c = 0; c < rowStr.length; c++) {
        if (rowStr[c] === '#' || rowStr[c] === '1') {
          target.setPixel(x + c, targetY, true);
        }
      }
    }
  }
}

export class SpaceBox implements Box {
  public width: number;
  public height = 0;
  public depth = 0;
  public totalHeight = 0;

  constructor(width: number) {
    this.width = Math.max(0, width);
  }

  public render(): void {
    // Space renders nothing
  }
}

export class RuleBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.depth = 0;
    this.totalHeight = height;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    target.fillRect(x, y - this.height, this.width, this.height, true);
  }
}

export interface ChildItem {
  box: Box;
  xOffset: number;
  yOffset: number; // offset relative to parent baseline (positive is down, negative is up)
}

export class HBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  public children: ChildItem[];

  constructor(children: ChildItem[], width?: number) {
    this.children = children;
    let maxH = 0;
    let maxD = 0;
    let calculatedW = 0;

    for (const item of children) {
      // item baseline is at yOffset
      // item top is at yOffset - item.box.height
      // item bottom is at yOffset + item.box.depth
      const topDist = item.box.height - item.yOffset;
      const bottomDist = item.box.depth + item.yOffset;

      if (topDist > maxH) maxH = topDist;
      if (bottomDist > maxD) maxD = bottomDist;

      const right = item.xOffset + item.box.width;
      if (right > calculatedW) calculatedW = right;
    }

    this.width = width !== undefined ? width : calculatedW;
    this.height = maxH;
    this.depth = maxD;
    this.totalHeight = maxH + maxD;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    for (const item of this.children) {
      item.box.render(target, x + item.xOffset, y + item.yOffset);
    }
  }
}

// Delimiter drawing helper
function drawStretchyDelimiter(
  delim: string,
  target: PixelTarget,
  x: number,
  y: number,
  totalH: number,
  ruleThickness: number = 1
): void {
  // y is top of delimiter
  const h = totalH;
  if (h <= 0) return;

  if (delim === '(') {
    // Rounded top, vertical bar, rounded bottom
    if (h <= 8) {
      // Small
      target.fillRect(x + 1, y, 1, 1);
      target.fillRect(x, y + 1, 1, h - 2);
      target.fillRect(x + 1, y + h - 1, 1, 1);
    } else {
      target.fillRect(x + 2, y, 1, 1);
      target.fillRect(x + 1, y + 1, 1, 1);
      target.fillRect(x, y + 2, 1, h - 4);
      target.fillRect(x + 1, y + h - 2, 1, 1);
      target.fillRect(x + 2, y + h - 1, 1, 1);
    }
  } else if (delim === ')') {
    if (h <= 8) {
      target.fillRect(x, y, 1, 1);
      target.fillRect(x + 1, y + 1, 1, h - 2);
      target.fillRect(x, y + h - 1, 1, 1);
    } else {
      target.fillRect(x, y, 1, 1);
      target.fillRect(x + 1, y + 1, 1, 1);
      target.fillRect(x + 2, y + 2, 1, h - 4);
      target.fillRect(x + 1, y + h - 2, 1, 1);
      target.fillRect(x, y + h - 1, 1, 1);
    }
  } else if (delim === '[') {
    const w = 3;
    target.fillRect(x, y, w, ruleThickness);
    target.fillRect(x, y, ruleThickness, h);
    target.fillRect(x, y + h - ruleThickness, w, ruleThickness);
  } else if (delim === ']') {
    const w = 3;
    target.fillRect(x, y, w, ruleThickness);
    target.fillRect(x + w - ruleThickness, y, ruleThickness, h);
    target.fillRect(x, y + h - ruleThickness, w, ruleThickness);
  } else if (delim === '{') {
    // Curly brace with middle tip
    const midY = Math.floor(y + h / 2);
    // Top hook
    target.fillRect(x + 2, y, 2, 1);
    target.fillRect(x + 1, y + 1, 1, 1);
    // Upper vertical stem
    if (midY - 1 > y + 2) {
      target.fillRect(x + 1, y + 2, 1, midY - 2 - y);
    }
    // Middle tip
    target.fillRect(x, midY - 1, 1, 2);
    // Lower vertical stem
    if (y + h - 2 > midY + 1) {
      target.fillRect(x + 1, midY + 1, 1, y + h - 2 - (midY + 1));
    }
    // Bottom hook
    target.fillRect(x + 1, y + h - 2, 1, 1);
    target.fillRect(x + 2, y + h - 1, 2, 1);
  } else if (delim === '}') {
    const midY = Math.floor(y + h / 2);
    target.fillRect(x, y, 2, 1);
    target.fillRect(x + 2, y + 1, 1, 1);
    if (midY - 1 > y + 2) {
      target.fillRect(x + 2, y + 2, 1, midY - 2 - y);
    }
    target.fillRect(x + 3, midY - 1, 1, 2);
    if (y + h - 2 > midY + 1) {
      target.fillRect(x + 2, midY + 1, 1, y + h - 2 - (midY + 1));
    }
    target.fillRect(x + 2, y + h - 2, 1, 1);
    target.fillRect(x, y + h - 1, 2, 1);
  } else if (delim === '|' || delim === '\\|') {
    target.fillRect(x, y, ruleThickness, h);
  }
}

export class DelimiterBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private delim: string;
  private ruleThickness: number;

  constructor(delim: string, height: number, depth: number, ruleThickness: number = 1) {
    this.delim = delim;
    this.ruleThickness = ruleThickness;
    this.height = height;
    this.depth = depth;
    this.totalHeight = height + depth;

    if (delim === '(' || delim === ')') {
      this.width = this.totalHeight <= 8 ? 2 : 3;
    } else if (delim === '[' || delim === ']') {
      this.width = 3;
    } else if (delim === '{' || delim === '}') {
      this.width = 4;
    } else if (delim === '|' || delim === '\\|') {
      this.width = 1;
    } else {
      this.width = 0; // null delimiter '.'
    }
  }

  public render(target: PixelTarget, x: number, y: number): void {
    if (this.width === 0 || this.delim === '.') return;
    const topY = y - this.height;
    drawStretchyDelimiter(this.delim, target, x, topY, this.totalHeight, this.ruleThickness);
  }
}

export class RadicalBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private radicand: Box;
  private indexBox?: Box;
  private ruleThickness: number;

  constructor(radicand: Box, indexBox?: Box, ruleThickness: number = 1) {
    this.radicand = radicand;
    this.indexBox = indexBox;
    this.ruleThickness = ruleThickness;

    // The radical needs:
    // Vinculum above radicand with 2px clearance:
    const clearance = 2;
    this.height = radicand.height + clearance + ruleThickness;
    this.depth = radicand.depth;
    this.totalHeight = this.height + this.depth;

    // Radical symbol width on left:
    // hook (2px) + slash (2-3px) + clearance (1px) = 5-6px
    const radicalSymbolWidth = 5;
    const indexWidth = indexBox ? Math.max(indexBox.width - 2, 0) : 0;
    this.width = indexWidth + radicalSymbolWidth + radicand.width + 2;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    const topY = y - this.height;
    const botY = y + this.depth;
    const radH = botY - topY;

    let radLeft = x;
    if (this.indexBox) {
      // Place index high in the crook
      const indexY = y - this.radicand.height;
      this.indexBox.render(target, x, indexY);
      radLeft = x + Math.max(this.indexBox.width - 2, 0);
    }

    // Radical hook and diagonal
    // Hook: small downward tick at middle left
    const hookY = Math.floor(botY - radH * 0.4);
    target.fillRect(radLeft, hookY, 1, 2, true);
    target.fillRect(radLeft + 1, hookY + 1, 1, 2, true);

    // Bottom crook
    const crookX = radLeft + 2;
    const crookY = botY;
    target.fillRect(crookX, crookY - 1, 1, 1, true);

    // Diagonal line from crook (crookX, crookY) up to top (topX, topY)
    const topX = radLeft + 4;
    const dy = crookY - topY;
    for (let sy = 0; sy < dy; sy++) {
      const curY = crookY - sy;
      const frac = sy / dy;
      const curX = Math.round(crookX + frac * (topX - crookX));
      target.setPixel(curX, curY, true);
    }

    // Vinculum (top horizontal bar over radicand)
    const vinculumStartX = topX;
    const vinculumW = this.radicand.width + 3;
    target.fillRect(vinculumStartX, topY, vinculumW, this.ruleThickness, true);

    // Render radicand under vinculum
    const radicandX = topX + 1;
    this.radicand.render(target, radicandX, y);
  }
}

export class FractionBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private num: Box;
  private den: Box;
  private mathAxis: number;
  private ruleThickness: number;

  constructor(num: Box, den: Box, mathAxis: number, ruleThickness: number = 1) {
    this.num = num;
    this.den = den;
    this.mathAxis = mathAxis;
    this.ruleThickness = ruleThickness;

    const pad = 2; // padding past max width
    const contentW = Math.max(num.width, den.width);
    this.width = contentW + pad * 2;

    const gap = 2; // gap between bar and content
    // Numerator is placed above bar
    // Bar is at Y = -mathAxis
    // Num bottom sits at (-mathAxis - gap)
    // Den top sits at (-mathAxis + ruleThickness + gap)
    this.height = mathAxis + gap + num.height + num.depth;
    this.depth = Math.max(0, den.height + den.depth + gap + ruleThickness - mathAxis);
    this.totalHeight = this.height + this.depth;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    const barY = y - this.mathAxis;
    // Draw 1px fraction bar
    target.fillRect(x, barY, this.width, this.ruleThickness, true);

    // Numerator centered horizontally
    const numX = x + Math.floor((this.width - this.num.width) / 2);
    const numY = barY - 2 - this.num.depth;
    this.num.render(target, numX, numY);

    // Denominator centered horizontally
    const denX = x + Math.floor((this.width - this.den.width) / 2);
    const denY = barY + this.ruleThickness + 2 + this.den.height;
    this.den.render(target, denX, denY);
  }
}

export class ScriptsBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private base: Box;
  private sup?: Box;
  private sub?: Box;
  private displayLimits: boolean;
  private metrics: BitmapFont['metrics'];

  constructor(
    base: Box,
    sup: Box | undefined,
    sub: Box | undefined,
    displayLimits: boolean,
    metrics: BitmapFont['metrics']
  ) {
    this.base = base;
    this.sup = sup;
    this.sub = sub;
    this.displayLimits = displayLimits;
    this.metrics = metrics;

    if (displayLimits) {
      // Limits placed directly above and below base (e.g. \sum_{n=1}^\infty)
      const supW = sup ? sup.width : 0;
      const subW = sub ? sub.width : 0;
      this.width = Math.max(base.width, supW, subW);

      let h = base.height;
      if (sup) {
        h += 2 + sup.height + sup.depth;
      }
      this.height = h;

      let d = base.depth;
      if (sub) {
        d += 2 + sub.height + sub.depth;
      }
      this.depth = d;
      this.totalHeight = this.height + this.depth;
    } else {
      // Inline scripts (to the right of base)
      const scriptW = Math.max(sup ? sup.width : 0, sub ? sub.width : 0);
      this.width = base.width + (scriptW > 0 ? scriptW + 1 : 0);

      const supRise = metrics.superscriptRise;
      const subDrop = metrics.subscriptDrop;

      let maxH = base.height;
      if (sup) {
        maxH = Math.max(maxH, supRise + sup.height);
      }
      this.height = maxH;

      let maxD = base.depth;
      if (sub) {
        maxD = Math.max(maxD, subDrop + sub.depth);
      }
      this.depth = maxD;
      this.totalHeight = this.height + this.depth;
    }
  }

  public render(target: PixelTarget, x: number, y: number): void {
    if (this.displayLimits) {
      const baseX = x + Math.floor((this.width - this.base.width) / 2);
      this.base.render(target, baseX, y);

      if (this.sup) {
        const supX = x + Math.floor((this.width - this.sup.width) / 2);
        const supY = y - this.base.height - 2 - this.sup.depth;
        this.sup.render(target, supX, supY);
      }

      if (this.sub) {
        const subX = x + Math.floor((this.width - this.sub.width) / 2);
        const subY = y + this.base.depth + 2 + this.sub.height;
        this.sub.render(target, subX, subY);
      }
    } else {
      this.base.render(target, x, y);

      const scriptX = x + this.base.width + 1;
      if (this.sup) {
        const supY = y - this.metrics.superscriptRise;
        this.sup.render(target, scriptX, supY);
      }

      if (this.sub) {
        const subY = y + this.metrics.subscriptDrop;
        this.sub.render(target, scriptX, subY);
      }
    }
  }
}

export class MatrixBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private cells: Box[][];
  private colWidths: number[];
  private rowHeights: number[];
  private rowDepths: number[];
  private colSpacing = 6;
  private rowSpacing = 4;
  private leftDelim?: DelimiterBox;
  private rightDelim?: DelimiterBox;

  constructor(
    type: 'pmatrix' | 'bmatrix' | 'matrix' | 'vmatrix' | 'cases',
    cells: Box[][],
    metrics: BitmapFont['metrics']
  ) {
    this.cells = cells;
    const numRows = cells.length;
    let numCols = 0;
    for (const row of cells) {
      if (row.length > numCols) numCols = row.length;
    }

    this.colWidths = new Array(numCols).fill(0);
    this.rowHeights = new Array(numRows).fill(0);
    this.rowDepths = new Array(numRows).fill(0);

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        const cell = cells[r][c];
        if (cell.width > this.colWidths[c]) this.colWidths[c] = cell.width;
        if (cell.height > this.rowHeights[r]) this.rowHeights[r] = cell.height;
        if (cell.depth > this.rowDepths[r]) this.rowDepths[r] = cell.depth;
      }
    }

    // Cases environment column spacing
    if (type === 'cases') {
      this.colSpacing = 8;
    }

    let innerW = 0;
    for (let c = 0; c < numCols; c++) {
      innerW += this.colWidths[c];
      if (c < numCols - 1) innerW += this.colSpacing;
    }

    let totalTableH = 0;
    for (let r = 0; r < numRows; r++) {
      totalTableH += this.rowHeights[r] + this.rowDepths[r];
      if (r < numRows - 1) totalTableH += this.rowSpacing;
    }

    // Baseline centered at table math axis
    const halfH = Math.floor(totalTableH / 2);
    this.height = halfH + metrics.mathAxis;
    this.depth = Math.max(0, totalTableH - this.height);
    this.totalHeight = this.height + this.depth;

    let leftD = '.';
    let rightD = '.';
    if (type === 'pmatrix') {
      leftD = '(';
      rightD = ')';
    } else if (type === 'bmatrix') {
      leftD = '[';
      rightD = ']';
    } else if (type === 'vmatrix') {
      leftD = '|';
      rightD = '|';
    } else if (type === 'cases') {
      leftD = '{';
      rightD = '.';
    }

    if (leftD !== '.') {
      this.leftDelim = new DelimiterBox(leftD, this.height, this.depth, metrics.ruleThickness);
    }
    if (rightD !== '.') {
      this.rightDelim = new DelimiterBox(rightD, this.height, this.depth, metrics.ruleThickness);
    }

    const delimPad = 2;
    this.width =
      (this.leftDelim ? this.leftDelim.width + delimPad : 0) +
      innerW +
      (this.rightDelim ? this.rightDelim.width + delimPad : 0);
  }

  public render(target: PixelTarget, x: number, y: number): void {
    let curX = x;
    if (this.leftDelim) {
      this.leftDelim.render(target, curX, y);
      curX += this.leftDelim.width + 2;
    }

    const tableTop = y - this.height;
    let rowTop = tableTop;

    for (let r = 0; r < this.cells.length; r++) {
      const row = this.cells[r];
      const rowBaseline = rowTop + this.rowHeights[r];

      let colX = curX;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        // Center or left-align cells: left-align for cases, center for matrices
        const cellX = colX;
        cell.render(target, cellX, rowBaseline);
        colX += this.colWidths[c] + this.colSpacing;
      }

      rowTop += this.rowHeights[r] + this.rowDepths[r] + this.rowSpacing;
    }

    if (this.rightDelim) {
      const rightX = x + this.width - this.rightDelim.width;
      this.rightDelim.render(target, rightX, y);
    }
  }
}

export class AccentBox implements Box {
  public width: number;
  public height: number;
  public depth: number;
  public totalHeight: number;
  private base: Box;
  private accent: 'vec' | 'hat' | 'bar' | 'dot' | 'ddot' | 'tilde';

  constructor(base: Box, accent: 'vec' | 'hat' | 'bar' | 'dot' | 'ddot' | 'tilde') {
    this.base = base;
    this.accent = accent;
    this.width = base.width;
    this.depth = base.depth;
    this.height = base.height + 2; // 2px for accent
    this.totalHeight = this.height + this.depth;
  }

  public render(target: PixelTarget, x: number, y: number): void {
    this.base.render(target, x, y);
    const accentY = y - this.base.height - 2;
    const midX = x + Math.floor(this.width / 2);

    if (this.accent === 'vec') {
      // Small right arrow: 4px long
      const left = midX - 2;
      target.fillRect(left, accentY, 4, 1, true);
      target.setPixel(left + 3, accentY - 1, true);
    } else if (this.accent === 'hat') {
      target.setPixel(midX, accentY - 1, true);
      target.setPixel(midX - 1, accentY, true);
      target.setPixel(midX + 1, accentY, true);
    } else if (this.accent === 'bar') {
      target.fillRect(x + 1, accentY, Math.max(1, this.width - 2), 1, true);
    } else if (this.accent === 'dot') {
      target.fillRect(midX, accentY, 1, 1, true);
    } else if (this.accent === 'ddot') {
      target.fillRect(midX - 1, accentY, 1, 1, true);
      target.fillRect(midX + 1, accentY, 1, 1, true);
    } else if (this.accent === 'tilde') {
      target.setPixel(midX - 1, accentY, true);
      target.setPixel(midX, accentY - 1, true);
      target.setPixel(midX + 1, accentY, true);
    }
  }
}

// Layout Engine
export class LayoutEngine {
  private preset: FontPreset;

  constructor(preset: FontPreset) {
    this.preset = preset;
  }

  public layout(node: MathNode): Box {
    return this.layoutNode(node, this.preset.mainFont);
  }

  private layoutNode(node: MathNode, font: BitmapFont): Box {
    switch (node.type) {
      case 'char': {
        const glyph = font.getGlyph(node.value);
        if (glyph) {
          return new GlyphBox(glyph);
        }
        // Fallback space
        return new SpaceBox(font.metrics.capHeight / 2);
      }

      case 'symbol': {
        const glyph = font.getGlyph(node.name);
        if (glyph) {
          return new GlyphBox(glyph);
        }
        // Fallback for unmapped symbols
        const fallback = font.getGlyph('?');
        return fallback ? new GlyphBox(fallback) : new SpaceBox(4);
      }

      case 'function': {
        // Functions like \sin, \cos, \ln render as a sequence of roman glyphs with function spacing
        const chars = node.name.split('');
        const children: ChildItem[] = [];
        let curX = 0;
        for (const c of chars) {
          const g = font.getGlyph(c);
          if (g) {
            const b = new GlyphBox(g);
            children.push({ box: b, xOffset: curX, yOffset: 0 });
            curX += b.width + font.metrics.charSpacing;
          }
        }
        // Function operator spacing on right (e.g. \sin x has gap before x)
        curX += font.metrics.operatorSpacing;
        return new HBox(children, curX);
      }

      case 'fraction': {
        // Lay out numerator and denominator with slightly smaller font or main font
        const numBox = this.layoutNode(node.numerator, font);
        const denBox = this.layoutNode(node.denominator, font);
        return new FractionBox(numBox, denBox, font.metrics.mathAxis, font.metrics.ruleThickness);
      }

      case 'radical': {
        const radicandBox = this.layoutNode(node.radicand, font);
        let indexBox: Box | undefined = undefined;
        if (node.index) {
          indexBox = this.layoutNode(node.index, this.preset.subFont);
        }
        return new RadicalBox(radicandBox, indexBox, font.metrics.ruleThickness);
      }

      case 'scripts': {
        const baseBox = this.layoutNode(node.base, font);
        const subBox = node.sub ? this.layoutNode(node.sub, this.preset.subFont) : undefined;
        const supBox = node.sup ? this.layoutNode(node.sup, this.preset.subFont) : undefined;
        return new ScriptsBox(baseBox, supBox, subBox, !!node.displayLimits, font.metrics);
      }

      case 'delimited': {
        const contentBox = this.layoutNode(node.content, font);
        const leftBox = new DelimiterBox(node.leftDelim, contentBox.height, contentBox.depth, font.metrics.ruleThickness);
        const rightBox = new DelimiterBox(node.rightDelim, contentBox.height, contentBox.depth, font.metrics.ruleThickness);

        const pad = 1;
        const children: ChildItem[] = [
          { box: leftBox, xOffset: 0, yOffset: 0 },
          { box: contentBox, xOffset: leftBox.width + pad, yOffset: 0 },
          { box: rightBox, xOffset: leftBox.width + pad + contentBox.width + pad, yOffset: 0 },
        ];
        return new HBox(children);
      }

      case 'matrix': {
        const cellBoxes: Box[][] = node.rows.map(row =>
          row.map(cell => this.layoutNode(cell, font))
        );
        return new MatrixBox(node.matrixType, cellBoxes, font.metrics);
      }

      case 'accent': {
        const baseBox = this.layoutNode(node.base, font);
        return new AccentBox(baseBox, node.accent);
      }

      case 'space': {
        return new SpaceBox(node.width);
      }

      case 'sequence': {
        return this.layoutSequence(node.children, font);
      }

      default:
        return new SpaceBox(0);
    }
  }

  private layoutSequence(children: MathNode[], font: BitmapFont): Box {
    const items: ChildItem[] = [];
    let curX = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const box = this.layoutNode(child, font);

      // Determine spacing before this element
      let preSpacing = 0;
      if (child.type === 'symbol') {
        if (child.symbolType === 'bin') {
          preSpacing = font.metrics.operatorSpacing;
        } else if (child.symbolType === 'rel') {
          preSpacing = font.metrics.operatorSpacing + 1;
        }
      } else if (child.type === 'char') {
        if (['+', '-', '*'].includes(child.value)) {
          preSpacing = font.metrics.operatorSpacing;
        } else if (['=', '<', '>'].includes(child.value)) {
          preSpacing = font.metrics.operatorSpacing + 1;
        }
      }

      // Check if previous element was binary or relational operator
      let postSpacing = 0;
      if (i > 0) {
        const prev = children[i - 1];
        if (prev.type === 'symbol') {
          if (prev.symbolType === 'bin') {
            postSpacing = font.metrics.operatorSpacing;
          } else if (prev.symbolType === 'rel') {
            postSpacing = font.metrics.operatorSpacing + 1;
          }
        } else if (prev.type === 'char') {
          if (['+', '-', '*'].includes(prev.value)) {
            postSpacing = font.metrics.operatorSpacing;
          } else if (['=', '<', '>'].includes(prev.value)) {
            postSpacing = font.metrics.operatorSpacing + 1;
          }
        }
      }

      curX += Math.max(preSpacing, postSpacing);
      items.push({ box, xOffset: curX, yOffset: 0 });
      curX += box.width;

      // Add standard char spacing between ordinary items
      if (i < children.length - 1) {
        const next = children[i + 1];
        if (child.type === 'char' && next.type === 'char') {
          curX += font.metrics.charSpacing;
        }
      }
    }

    return new HBox(items, curX);
  }
}
