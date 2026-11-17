import type {
  MathNode,
  MatrixNode,
  AccentNode,
} from './types';

// Map of command to symbol type
const GREEK_LOWER = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
]);

const GREEK_UPPER = new Set([
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
  'Upsilon', 'Phi', 'Psi', 'Omega'
]);

const BINARY_OPS = new Set([
  'pm', 'mp', 'times', 'div', 'cdot', 'cup', 'cap'
]);

const RELATIONS = new Set([
  'neq', 'leq', 'geq', 'approx', 'equiv', 'sim', 'propto',
  'to', 'mapsto', 'Rightarrow', 'Leftrightarrow', 'in', 'notin', 'subset'
]);

const ORDINARY_SYMBOLS = new Set([
  'infty', 'partial', 'nabla', 'forall', 'exists', 'hbar'
]);

const BIG_OPS = new Set([
  'sum', 'prod', 'int', 'iint', 'oint', 'coprod'
]);

const STANDARD_FUNCS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'exp', 'lim', 'max', 'min', 'det', 'gcd'
]);

export interface Token {
  type: 'COMMAND' | 'CHAR' | 'LBRACE' | 'RBRACE' | 'LBRACKET' | 'RBRACKET' | 'CARET' | 'UNDERSCORE' | 'AMP' | 'NEWLINE' | 'EOF';
  value: string;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const c = input[i];

    // Whitespace: standard spaces are skipped unless explicit LaTeX space
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      i++;
      continue;
    }

    if (c === '\\') {
      i++;
      if (i >= len) break;
      const nextChar = input[i];

      // Special escaped characters
      if (nextChar === '\\') {
        tokens.push({ type: 'NEWLINE', value: '\\\\' });
        i++;
      } else if (nextChar === '{' || nextChar === '}') {
        tokens.push({ type: 'CHAR', value: nextChar });
        i++;
      } else if (nextChar === ',' || nextChar === ';' || nextChar === ':' || nextChar === '!') {
        tokens.push({ type: 'COMMAND', value: nextChar });
        i++;
      } else if (/[a-zA-Z]/.test(nextChar)) {
        let name = '';
        while (i < len && /[a-zA-Z]/.test(input[i])) {
          name += input[i];
          i++;
        }
        tokens.push({ type: 'COMMAND', value: name });
      } else {
        tokens.push({ type: 'CHAR', value: nextChar });
        i++;
      }
    } else if (c === '{') {
      tokens.push({ type: 'LBRACE', value: '{' });
      i++;
    } else if (c === '}') {
      tokens.push({ type: 'RBRACE', value: '}' });
      i++;
    } else if (c === '[') {
      tokens.push({ type: 'LBRACKET', value: '[' });
      i++;
    } else if (c === ']') {
      tokens.push({ type: 'RBRACKET', value: ']' });
      i++;
    } else if (c === '^') {
      tokens.push({ type: 'CARET', value: '^' });
      i++;
    } else if (c === '_') {
      tokens.push({ type: 'UNDERSCORE', value: '_' });
      i++;
    } else if (c === '&') {
      tokens.push({ type: 'AMP', value: '&' });
      i++;
    } else if (c === '~') {
      tokens.push({ type: 'COMMAND', value: 'space' });
      i++;
    } else {
      tokens.push({ type: 'CHAR', value: c });
      i++;
    }
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private next(): Token {
    const tok = this.peek();
    if (this.pos < this.tokens.length) {
      this.pos++;
    }
    return tok;
  }

  private match(type: Token['type'], value?: string): boolean {
    const tok = this.peek();
    if (tok.type === type && (value === undefined || tok.value === value)) {
      this.next();
      return true;
    }
    return false;
  }

  public parse(): MathNode {
    const nodes = this.parseList();
    if (nodes.length === 1) return nodes[0];
    return { type: 'sequence', children: nodes };
  }

  private parseList(stopCondition?: () => boolean): MathNode[] {
    const list: MathNode[] = [];

    while (this.peek().type !== 'EOF') {
      if (stopCondition && stopCondition()) {
        break;
      }
      const tok = this.peek();
      if (tok.type === 'RBRACE' || tok.type === 'AMP' || tok.type === 'NEWLINE') {
        break;
      }

      const item = this.parseItem();
      if (item) {
        list.push(item);
      } else {
        this.next(); // prevent infinite loop
      }
    }

    return list;
  }

  private parseGroupOrItem(): MathNode {
    if (this.match('LBRACE')) {
      const items = this.parseList();
      this.match('RBRACE');
      if (items.length === 1) return items[0];
      return { type: 'sequence', children: items };
    }
    return this.parseAtom() || { type: 'char', value: ' ' };
  }

  private parseItem(): MathNode | null {
    let base = this.parseAtom();
    if (!base) return null;

    // Check for superscripts and subscripts
    while (this.peek().type === 'CARET' || this.peek().type === 'UNDERSCORE') {
      let sub: MathNode | undefined = undefined;
      let sup: MathNode | undefined = undefined;

      if (this.match('CARET')) {
        sup = this.parseGroupOrItem();
        if (this.match('UNDERSCORE')) {
          sub = this.parseGroupOrItem();
        }
      } else if (this.match('UNDERSCORE')) {
        sub = this.parseGroupOrItem();
        if (this.match('CARET')) {
          sup = this.parseGroupOrItem();
        }
      }

      // Check if base is big operator (like \sum, \prod) or \lim that takes limits above/below
      const isDisplayLim: boolean =
        (base.type === 'symbol' && BIG_OPS.has(base.name) && base.name !== 'int' && base.name !== 'iint' && base.name !== 'oint') ||
        (base.type === 'function' && (base.name === 'lim' || base.name === 'max' || base.name === 'min'));

      base = {
        type: 'scripts',
        base,
        sub,
        sup,
        displayLimits: isDisplayLim,
      };
    }

    return base;
  }

  private parseAtom(): MathNode | null {
    const tok = this.peek();

    if (tok.type === 'LBRACE') {
      this.next();
      const nodes = this.parseList();
      this.match('RBRACE');
      if (nodes.length === 1) return nodes[0];
      return { type: 'sequence', children: nodes };
    }

    if (tok.type === 'CHAR') {
      this.next();
      return { type: 'char', value: tok.value };
    }

    if (tok.type === 'LBRACKET') {
      this.next();
      return { type: 'char', value: '[' };
    }

    if (tok.type === 'RBRACKET') {
      this.next();
      return { type: 'char', value: ']' };
    }

    if (tok.type === 'COMMAND') {
      const cmd = tok.value;
      this.next();

      // Fractions: \frac{a}{b}
      if (cmd === 'frac') {
        const numerator = this.parseGroupOrItem();
        const denominator = this.parseGroupOrItem();
        return { type: 'fraction', numerator, denominator };
      }

      // Roots: \sqrt[n]{x} or \sqrt{x}
      if (cmd === 'sqrt') {
        let index: MathNode | undefined = undefined;
        if (this.match('LBRACKET')) {
          const indexNodes = this.parseList(() => this.peek().type === 'RBRACKET');
          this.match('RBRACKET');
          index = indexNodes.length === 1 ? indexNodes[0] : { type: 'sequence', children: indexNodes };
        }
        const radicand = this.parseGroupOrItem();
        return { type: 'radical', radicand, index };
      }

      // Delimiters: \left( ... \right)
      if (cmd === 'left') {
        let leftDelim = '(';
        const delimTok = this.next();
        if (delimTok) leftDelim = delimTok.value;
        if (leftDelim === '\\') {
          // e.g. \{
          const next = this.next();
          leftDelim = next.value;
        }

        const contentNodes = this.parseList(() => {
          const t = this.peek();
          return t.type === 'COMMAND' && t.value === 'right';
        });

        let rightDelim = ')';
        if (this.match('COMMAND', 'right')) {
          const rTok = this.next();
          if (rTok) rightDelim = rTok.value;
          if (rightDelim === '\\') {
            const next = this.next();
            rightDelim = next.value;
          }
        }

        const content: MathNode = contentNodes.length === 1 ? contentNodes[0] : { type: 'sequence', children: contentNodes };
        return { type: 'delimited', leftDelim, rightDelim, content };
      }

      // Environments: \begin{pmatrix} ... \end{pmatrix}
      if (cmd === 'begin') {
        let envName = 'matrix';
        if (this.match('LBRACE')) {
          let name = '';
          while (this.peek().type !== 'RBRACE' && this.peek().type !== 'EOF') {
            name += this.next().value;
          }
          this.match('RBRACE');
          if (name) envName = name;
        }

        const rows: MathNode[][] = [];
        let currentRow: MathNode[] = [];
        let currentCell: MathNode[] = [];

        while (this.peek().type !== 'EOF') {
          const t = this.peek();
          if (t.type === 'COMMAND' && t.value === 'end') {
            this.next(); // consume \end
            if (this.match('LBRACE')) {
              while (this.peek().type !== 'RBRACE' && this.peek().type !== 'EOF') {
                this.next();
              }
              this.match('RBRACE');
            }
            break;
          }

          if (t.type === 'AMP') {
            this.next();
            const cellNode: MathNode = currentCell.length === 1 ? currentCell[0] : { type: 'sequence', children: currentCell };
            currentRow.push(cellNode);
            currentCell = [];
          } else if (t.type === 'NEWLINE') {
            this.next();
            const cellNode: MathNode = currentCell.length === 1 ? currentCell[0] : { type: 'sequence', children: currentCell };
            currentRow.push(cellNode);
            rows.push(currentRow);
            currentRow = [];
            currentCell = [];
          } else {
            const node = this.parseItem();
            if (node) {
              currentCell.push(node);
            } else {
              this.next(); // prevent loop
            }
          }
        }

        if (currentCell.length > 0 || currentRow.length > 0) {
          const cellNode: MathNode = currentCell.length === 1 ? currentCell[0] : { type: 'sequence', children: currentCell };
          currentRow.push(cellNode);
          rows.push(currentRow);
        }

        const validTypes = ['pmatrix', 'bmatrix', 'matrix', 'vmatrix', 'cases', 'align', 'aligned', 'align*'];
        const cleanEnv = envName.replace('*', '') as MatrixNode['matrixType'];
        const mType = validTypes.includes(envName) ? cleanEnv : 'matrix';
        return { type: 'matrix', matrixType: mType, rows };
      }

      // Accents: \vec{x}, \hat{x}, \bar{x}, \dot{x}, \ddot{x}, \tilde{x}
      if (['vec', 'hat', 'bar', 'dot', 'ddot', 'tilde'].includes(cmd)) {
        const base = this.parseGroupOrItem();
        return { type: 'accent', accent: cmd as AccentNode['accent'], base };
      }

      // Greek lowercase
      if (GREEK_LOWER.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'ord' };
      }

      // Greek uppercase
      if (GREEK_UPPER.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'ord' };
      }

      // Binary operators
      if (BINARY_OPS.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'bin' };
      }

      // Relations
      if (RELATIONS.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'rel' };
      }

      // Ordinary symbols
      if (ORDINARY_SYMBOLS.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'ord' };
      }

      // Big operators
      if (BIG_OPS.has(cmd)) {
        return { type: 'symbol', name: cmd, symbolType: 'op' };
      }

      // Standard functions
      if (STANDARD_FUNCS.has(cmd)) {
        return { type: 'function', name: cmd, hasLimits: cmd === 'lim' || cmd === 'max' || cmd === 'min' };
      }

      // Spacing hierarchy: \, (1px), \: (2px), \; (3px)
      if (cmd === ',' || cmd === 'thinspace') {
        return { type: 'space', width: 1 };
      }
      if (cmd === ':' || cmd === 'medspace') {
        return { type: 'space', width: 2 };
      }
      if (cmd === ';' || cmd === 'thickspace') {
        return { type: 'space', width: 3 };
      }
      if (cmd === 'quad') {
        return { type: 'space', width: 6 };
      }
      if (cmd === 'qquad') {
        return { type: 'space', width: 12 };
      }
      if (cmd === '!') {
        return { type: 'space', width: -1 };
      }

      // Fonts / Styles: \mathrm{...}, \mathbf{...}, \text{...}
      if (cmd === 'mathrm' || cmd === 'mathbf' || cmd === 'text') {
        const content = this.parseGroupOrItem();
        return content;
      }

      // Fallback: render command name as symbol or sequence of characters
      return { type: 'symbol', name: cmd, symbolType: 'ord' };
    }

    return null;
  }
}

export function parseLatex(input: string): MathNode {
  const parser = new Parser(input);
  return parser.parse();
}
