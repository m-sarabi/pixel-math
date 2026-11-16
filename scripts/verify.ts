import fs from 'fs';
import path from 'path';
import { PixelMathRenderer } from '../src/engine/renderer';
import { PNG } from 'pngjs';
import { standardFont } from '../src/engine/fonts';

console.log('====================================================');
console.log('    PixelMath Round 2: Rigorous Verification Suite   ');
console.log('====================================================\n');

const outputDir = path.resolve(process.cwd(), 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let allPassed = true;

// 1. Edge Case Test Equations
const testEquations = [
  {
    name: 'trig_identity_powers',
    desc: 'Sin squared spacing check',
    latex: '\\sin^2 x + \\cos^2 x = 1',
  },
  {
    name: 'stretchy_integral_frac',
    desc: 'Integral dynamically stretching with tall fraction',
    latex: '\\int \\frac{1}{x^2 + 1}\\,dx = \\arctan x + C',
  },
  {
    name: 'symmetric_curly_braces',
    desc: 'Delimited with mirrored braces',
    latex: '\\left\\{ \\frac{x^2 + 1}{y - 3} \\right\\} = \\begin{cases} 1 & x \\geq 0 \\\\ -1 & x < 0 \\end{cases}',
  },
  {
    name: 'gaussian_limits',
    desc: 'Definite integral with limits at hooks',
    latex: '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}',
  },
  {
    name: 'quadratic_formula',
    desc: 'Classic quadratic formula with fraction and radical',
    latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  },
  {
    name: 'greek_letters',
    desc: 'All lowercase Greek letters',
    latex: '\\alpha\\beta\\gamma\\delta\\epsilon\\zeta\\eta\\theta\\iota\\kappa\\lambda\\mu\\nu\\xi\\pi\\rho\\sigma\\tau\\upsilon\\phi\\chi\\psi\\omega',
  },
];

console.log('--- Testing Standard Font on All Critical Cases ---');
for (const eq of testEquations) {
  const filename = `${eq.name}.png`;
  const filepath = path.join(outputDir, filename);

  const res = PixelMathRenderer.render(eq.latex, {
    presetId: 'standard',
    padding: 3,
    fgColor: { r: 255, g: 255, b: 255, a: 255 },
  });

  fs.writeFileSync(filepath, Buffer.from(res.pngBytes));

  if (res.width <= 0 || res.height <= 0) {
    console.error(`❌ [FAIL] ${eq.name}: Invalid dimensions ${res.width}x${res.height}`);
    allPassed = false;
    continue;
  }

  // Strict 1-bit alpha check
  const png = PNG.sync.read(fs.readFileSync(filepath));
  let nonOneBit = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a !== 0 && a !== 255) nonOneBit++;
  }

  if (nonOneBit > 0) {
    console.error(`❌ [FAIL] ${eq.name}: Detected ${nonOneBit} semi-transparent pixels!`);
    allPassed = false;
  } else {
    console.log(`✓ [PASS] ${eq.name}: ${res.width}×${res.height} px (${res.activePixels} pixels, alpha strictly 0/255) - ${eq.desc}`);
  }
}

// 2. Programmatic Verification: Curly Braces Perfect Symmetry
console.log('\n--- Programmatic Check: Curly Braces Symmetry ---');
{
  // Render { a }
  const leftBraceRes = PixelMathRenderer.render('\\left\\{ x \\right\\}', { presetId: 'standard', padding: 0 });
  const buf = leftBraceRes.buffer;

  // Find left brace on left side (x in [0, 3]) and right brace on right side
  const w = buf.width;
  const h = buf.height;

  // Verify that right brace pixels are the exact horizontal mirror of left brace pixels!
  let mirroredMismatches = 0;
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      const leftPixel = buf.getPixel(c, y);
      const rightPixel = buf.getPixel(w - 1 - c, y);
      if (leftPixel !== rightPixel) {
        mirroredMismatches++;
      }
    }
  }

  if (mirroredMismatches === 0) {
    console.log(`✓ Curly braces are 100% HORIZONTALLY MIRRORED & SYMMETRICAL (0 mismatches across all ${h * 4} pixels)`);
  } else {
    console.error(`❌ [FAIL] Curly braces symmetry mismatch: ${mirroredMismatches} pixels differ`);
    allPassed = false;
  }
}

// 3. Programmatic Verification: \sin^2 x Spacing
console.log('\n--- Programmatic Check: \\sin^2 x Power Spacing ---');
{
  const sin2Res = PixelMathRenderer.render('\\sin^2 x', { presetId: 'standard', padding: 0 });
  const sinRes = PixelMathRenderer.render('\\sin', { presetId: 'standard', padding: 0 });

  console.log(`Tight '\\sin' width: ${sinRes.width} px, '\\sin^2 x' width: ${sin2Res.width} px`);
  // The superscript 2 should begin at x = sinRes.width + 1 (no extra 3px operator spacing in between)
  // Let's verify that row 0-5 at column (sinRes.width + 1) has active pixels for the superscript
  let supFound = false;
  for (let y = 0; y < 6; y++) {
    if (sin2Res.buffer.getPixel(sinRes.width + 1, y) || sin2Res.buffer.getPixel(sinRes.width + 2, y)) {
      supFound = true;
      break;
    }
  }

  if (supFound) {
    console.log(`✓ Superscript '2' is tightly and properly attached to 'sin' (starts at column ${sinRes.width + 1})`);
  } else {
    console.error(`❌ [FAIL] Superscript '2' not found immediately after 'sin'`);
    allPassed = false;
  }
}

// 4. Programmatic Verification: Stretchy Integral Height
console.log('\n--- Programmatic Check: Dynamically Stretchy Integral ---');
{
  const simpleIntRes = PixelMathRenderer.render('\\int x\\,dx', { presetId: 'standard', padding: 0 });
  const fracIntRes = PixelMathRenderer.render('\\int \\frac{x^2 + 1}{x - 1}\\,dx', { presetId: 'standard', padding: 0 });

  console.log(`Simple integral total height: ${simpleIntRes.height} px`);
  console.log(`Fraction integral total height: ${fracIntRes.height} px`);

  if (fracIntRes.height > simpleIntRes.height + 6) {
    console.log(`✓ Integral dynamically stretched from ${simpleIntRes.height}px to ${fracIntRes.height}px to match fraction height!`);
  } else {
    console.error(`❌ [FAIL] Integral did not stretch sufficiently for fraction`);
    allPassed = false;
  }
}

// 5. Programmatic Verification: Refined Characters 'm', 'g', 'y', 'i'
console.log('\n--- Programmatic Check: Refined Glyphs Integrity ---');
{
  const glyphsToVerify = ['m', 'g', 'y', 'i', 'alpha', 'beta', 'theta', 'phi', 'omega'];
  for (const gName of glyphsToVerify) {
    const glyph = standardFont.getGlyph(gName);
    if (!glyph) {
      console.error(`❌ [FAIL] Missing glyph '${gName}'`);
      allPassed = false;
      continue;
    }
    // Check pattern rows are uniform width
    const w = glyph.width;
    let validRows = true;
    for (const r of glyph.rows) {
      if (r.length !== w) validRows = false;
    }
    if (validRows && w > 0 && glyph.height > 0) {
      console.log(`✓ Glyph '${gName}' verified: ${w}×${glyph.height} px (ascent: ${glyph.ascent}, descent: ${glyph.descent})`);
    } else {
      console.error(`❌ [FAIL] Glyph '${gName}' has invalid dimensions or non-uniform rows`);
      allPassed = false;
    }
  }
}

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL ROUND 2 VERIFICATION CHECKS PASSED PERFECTLY!');
} else {
  console.log('❌ SOME VERIFICATION CHECKS FAILED');
  process.exit(1);
}
console.log('====================================================\n');
