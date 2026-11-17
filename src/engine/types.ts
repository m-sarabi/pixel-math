export type MathNodeType =
  | 'sequence'
  | 'char'
  | 'symbol'
  | 'function'
  | 'fraction'
  | 'radical'
  | 'scripts'
  | 'delimited'
  | 'matrix'
  | 'accent'
  | 'space';

export interface BaseNode {
  type: MathNodeType;
}

export interface SequenceNode extends BaseNode {
  type: 'sequence';
  children: MathNode[];
}

export interface CharNode extends BaseNode {
  type: 'char';
  value: string;
  variant?: 'roman' | 'italic' | 'bold';
}

export interface SymbolNode extends BaseNode {
  type: 'symbol';
  name: string; // e.g. 'alpha', 'times', 'pm', 'leq', etc.
  symbolType: 'bin' | 'rel' | 'ord' | 'op' | 'punct' | 'open' | 'close';
}

export interface FunctionNode extends BaseNode {
  type: 'function';
  name: string; // e.g. 'sin', 'cos', 'log', 'lim'
  hasLimits?: boolean;
}

export interface FractionNode extends BaseNode {
  type: 'fraction';
  numerator: MathNode;
  denominator: MathNode;
}

export interface RadicalNode extends BaseNode {
  type: 'radical';
  radicand: MathNode;
  index?: MathNode;
}

export interface ScriptsNode extends BaseNode {
  type: 'scripts';
  base: MathNode;
  sub?: MathNode;
  sup?: MathNode;
  displayLimits?: boolean; // if true, limits are placed above/below (for \sum, \prod, etc.)
}

export interface DelimitedNode extends BaseNode {
  type: 'delimited';
  leftDelim: string; // '(', '[', '{', '|', '.', etc.
  rightDelim: string; // ')', ']', '}', '|', '.', etc.
  content: MathNode;
}

export interface MatrixNode extends BaseNode {
  type: 'matrix';
  matrixType: 'pmatrix' | 'bmatrix' | 'matrix' | 'vmatrix' | 'cases' | 'align' | 'aligned';
  rows: MathNode[][];
}

export interface AccentNode extends BaseNode {
  type: 'accent';
  accent: 'vec' | 'hat' | 'bar' | 'dot' | 'ddot' | 'tilde';
  base: MathNode;
}

export interface SpaceNode extends BaseNode {
  type: 'space';
  width: number; // in pixels relative to font unit
}

export type MathNode =
  | SequenceNode
  | CharNode
  | SymbolNode
  | FunctionNode
  | FractionNode
  | RadicalNode
  | ScriptsNode
  | DelimitedNode
  | MatrixNode
  | AccentNode
  | SpaceNode;

// Box model interfaces for TeX layout
export interface Box {
  width: number;
  height: number; // ascent above baseline (>= 0)
  depth: number;  // descent below baseline (>= 0)
  totalHeight: number; // height + depth
  render(target: PixelTarget, x: number, y: number): void;
}

export interface PixelTarget {
  width: number;
  height: number;
  setPixel(x: number, y: number, value?: boolean): void;
  getPixel(x: number, y: number): boolean;
  fillRect(x: number, y: number, w: number, h: number, value?: boolean): void;
  drawHLine(x: number, y: number, w: number, value?: boolean): void;
  drawVLine(x: number, y: number, h: number, value?: boolean): void;
  blit(source: PixelTarget, dstX: number, dstY: number): void;
}
