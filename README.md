# PixelMath

> A deterministic 1-bit pixel-art LaTeX formula rendering engine and static web application for retro graphics, games, and pixel art.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![1-bit Bitmap Engine](https://img.shields.io/badge/Engine-True%20Bitmap%20Box--Model-00f0ff.svg)
![Zero Anti-Aliasing](https://img.shields.io/badge/Alpha-Strict%200%20or%20255-2ea043.svg)

---

## Highlights

- **True Bitmap Box-Model Engine (No Vector Fonts or Canvas `fillText`):** Every character and symbol is stamped from handcrafted 2D bit matrices onto exact integer coordinates with uniform `1px` stroke thickness and fixed baselines.
- **Dynamic 1:1 Canvas Sizing:** Canvas expands automatically vertically and horizontally to fit any expression at native pixel resolution. Characters never squash or scale.
- **Multiple Readable Font Presets:**
  - **Compact:** `5×7` cap height (`3×5` sub-glyphs)
  - **Standard:** `7×9` cap height (`4×6` sub-glyphs, default)
  - **Large:** `9×12` cap height (`5×7` sub-glyphs)
- **Supported LaTeX Syntax & Stretchy Pixel Operators:**
  - Latin (`a-z`, `A-Z`), Digits (`0-9`), and Greek (`\alpha`–`\omega`, `\Gamma`–`\Omega`)
  - Operators & Relations: `+`, `-`, `\pm`, `\mp`, `\times`, `\div`, `\cdot`, `=`, `\neq`, `<`, `>`, `\leq`, `\geq`, `\approx`, `\equiv`, `\sim`, `\propto`, `\to`, `\mapsto`, `\Rightarrow`, `\Leftrightarrow`, `\infty`, `\partial`, `\nabla`, `\forall`, `\exists`, `\in`, `\notin`, `\subset`, `\cup`, `\cap`
  - Standard Functions: upright roman rendering for `\sin`, `\cos`, `\tan`, `\cot`, `\sec`, `\csc`, `\arcsin`, `\arccos`, `\arctan`, `\sinh`, `\cosh`, `\tanh`, `\ln`, `\log`, `\exp`, `\lim`, `\max`, `\min`, `\det`, `\gcd`
  - Fractions & Roots: `\frac{a}{b}` (horizontal 1px bar padded 1px+ past width with clean separation), `\sqrt{x}` and `\sqrt[n]{x}` (dynamically stretching pixel radical hook, diagonal, and top vinculum bar)
  - Scripts & Big Operators: `^{}`, `_{}`, combined `x_i^2`, and large operators `\int`, `\iint`, `\oint`, `\sum`, `\prod` with limits
  - Delimiters & Environments: `\left( ... \right)`, `\left[ ... \right]`, `\left\{ ... \right\}`, `\left| ... \right|`, `\begin{pmatrix}`, `\begin{bmatrix}`, `\begin{cases}`, and accents (`\vec`, `\hat`, `\bar`)
- **Cyberpunk Dark-Mode UI:**
  - Interactive formula editor with real-time feedback
  - Clickable symbol palette & equation template gallery
  - Stepped zoom (`4×` to `20×`) with `image-rendering: pixelated`
  - Toggleable `1px` pixel grid overlay and transparency checkerboard
  - Strict 1-bit color picker (GameBoy, Cyber Cyan, Amber CRT, Neon Pink, Solar Gold, Pure White, Pure Black)
  - Live dimension & active pixel telemetry
  - One-click **Download 1:1 PNG** and **Copy PNG to Clipboard**

---

## Verification Test Suite

Run the automated programmatic verification script:

```bash
npm test
```

This verifies:
1. All complex reference formulas across all 3 font presets:
   - `\int \cos x\,dx = \sin x + C`
   - `\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`
   - `\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}`
   - `\left( \frac{x^2 + 1}{y - 3} \right) = \begin{cases} 1 & x \geq 0 \\ -1 & x < 0 \end{cases}`
2. Strict 1-bit alpha (`0` or `255` only, zero anti-aliased pixels).
3. Clean `1px+` separation between numerators, denominators, radicals, and fraction bars.
4. Deterministic pixel-for-pixel identity for repeated glyphs and baseline consistency.

---

## Development & Build

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run automated verification tests
npm test

# Build static site for production (dist/)
npm run build
```

---

## Deployment to GitHub Pages

A ready-to-use GitHub Actions workflow is provided at `.github/workflows/deploy.yml`. On pushing to the `main` branch, the static site is automatically built and deployed to GitHub Pages.
