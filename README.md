# PixelMath

> A deterministic 1-bit pixel-art LaTeX formula rendering engine and static web application for retro graphics, games, and pixel art.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![1-bit Bitmap Engine](https://img.shields.io/badge/Engine-True%20Bitmap%20Box--Model-00f0ff.svg)
![Zero Anti-Aliasing](https://img.shields.io/badge/Alpha-Strict%200%20or%20255-2ea043.svg)

---

## Highlights

- **True Bitmap Box-Model Engine (No Vector Fonts or Canvas `fillText`):** Every character and symbol is stamped from handcrafted 2D bit matrices onto exact integer coordinates with uniform `1px` stroke thickness and fixed baselines.
- **Refined Standard Typography (7×9 Cap Height, 4×6 Sub-Glyphs):**
  - Handcrafted Latin alphabet with authentic mathematical letterforms:
    - `'m'`: 7px wide double-arched glyph with 3 vertical legs
    - `'g'`: x-height oval bowl with smooth single-loop hook descender
    - `'y'`: symmetric V-branch with centered vertical descender
    - `'i'`: 3px wide with stem aligned to x-height and separated 1px dot
  - Comprehensive Greek alphabet (`\alpha`–`\omega`, `\Gamma`–`\Omega`): beautifully proportioned, distinct mathematical letterforms.
- **Dynamically Stretchy Calculus Integrals:**
  - `\int` dynamically stretches its vertical stem to cover the full height of tall integrands (such as fractions or matrices) while keeping authentic hook curls at top and bottom.
  - Limit positioning at hooks for definite integrals (`\int_{a}^{b}`).
- **100% Mathematically Symmetrical Delimiters:**
  - Curly braces `\{` and `\}` are exact horizontal and vertical mirror reflections of each other with balanced hooks and center cusps.
  - Stretchy parentheses `\left(` `\right)` and brackets `\left[` `\right]`.
- **Accurate Function Spacing & Exponents:**
  - `\sin^2 x` places the exponent `2` immediately next to `\sin` without awkward gaps, with clean `3px` spacing before the argument `x`.
  - Guaranteed `1px+` minimum separation between all consecutive ordinary tokens—characters never touch or merge.
- **Dynamic 1:1 Canvas Sizing:** Canvas bounds expand automatically vertically and horizontally to fit any expression at native pixel resolution. Characters never squash or scale.
- **Cyberpunk Dark-Mode UI:**
  - Interactive formula editor with real-time feedback
  - Clickable symbol palette & equation template gallery
  - Stepped zoom (`4×` to `20×`) with `image-rendering: pixelated`
  - Toggleable `1px` pixel grid overlay and transparency checkerboard
  - Strict 1-bit color picker (GameBoy, Cyber Cyan, Amber CRT, Neon Pink, Solar Gold, Pure White, Pure Black)
  - Live dimension & active pixel telemetry
  - One-click **Download 1:1 PNG** and **Copy PNG to Clipboard** (`navigator.clipboard.write`)

---

## Verification Test Suite

Run the automated programmatic verification script:

```bash
npm test
```

This verifies:
1. Critical reference equations:
   - Pythagorean identity (`\sin^2 x + \cos^2 x = 1`)
   - Stretchy integral with tall fraction (`\int \frac{1}{x^2 + 1}\,dx = \arctan x + C`)
   - Symmetric curly braces & piecewise cases (`\left\{ \frac{x^2 + 1}{y - 3} \right\} = \begin{cases} 1 & x \geq 0 \\ -1 & x < 0 \end{cases}`)
   - Gaussian integral with limits (`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`)
   - Quadratic formula (`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`)
   - Greek alphabet (`\alpha`–`\omega`)
2. Strict 1-bit alpha (`0` or `255` only, zero anti-aliased pixels).
3. Exact horizontal mirror symmetry across curly brace columns.
4. Proper `\sin^2 x` exponent placement.
5. Dynamic integral height stretching.
6. Glyph integrity for `'m'`, `'g'`, `'y'`, `'i'`, and Greek letters.

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

A GitHub Actions workflow is provided at `.github/workflows/deploy.yml` to automatically build and deploy the application to GitHub Pages on push to `main`.
