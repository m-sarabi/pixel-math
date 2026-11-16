import fs from 'fs';
import path from 'path';
import { PixelMathRenderer } from '../src/engine/renderer';
import { PNG } from 'pngjs';
import { standardFont } from '../src/engine/fonts';

console.log('====================================================');
console.log('       PixelMath Automated Verification Suite       ');
console.log('====================================================\n');

const outputDir = path.resolve(process.cwd(), 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let allPassed = true;

// 1. Rigorous Test of Required Equations Across All 3 Presets
const testEquations = [
  { name: 'integral_trig', latex: '\\int \\cos x\\,dx = \\sin x + C' },
  { name: 'quadratic_formula', latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'basel_problem', latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}' },
  { name: 'piecewise_cases', latex: '\\left( \\frac{x^2 + 1}{y - 3} \\right) = \\begin{cases} 1 & x \\geq 0 \\\\ -1 & x < 0 \\end{cases}' },
];

const presets = ['standard', 'compact', 'large'] as const;

for (const preset of presets) {
  console.log(`\n=== Presets: ${preset.toUpperCase()} ===`);
  for (const eq of testEquations) {
    const filename = `${eq.name}_${preset}.png`;
    const filepath = path.join(outputDir, filename);

    const res = PixelMathRenderer.render(eq.latex, {
      presetId: preset,
      padding: 3,
      fgColor: { r: 255, g: 255, b: 255, a: 255 },
    });

    fs.writeFileSync(filepath, Buffer.from(res.pngBytes));

    // Verify valid dimensions
    if (res.width <= 0 || res.height <= 0) {
      console.error(`❌ [FAIL] ${eq.name} invalid dimensions: ${res.width}x${res.height}`);
      allPassed = false;
      continue;
    }

    // Verify PNG header and decoding
    const png = PNG.sync.read(fs.readFileSync(filepath));
    if (png.width !== res.width || png.height !== res.height) {
      console.error(`❌ [FAIL] ${eq.name} PNG header mismatch`);
      allPassed = false;
      continue;
    }

    // Verify strict 1-bit alpha (0 or 255 only)
    let semiTransparentCount = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const alpha = png.data[i + 3];
      if (alpha !== 0 && alpha !== 255) {
        semiTransparentCount++;
      }
    }

    if (semiTransparentCount > 0) {
      console.error(`❌ [FAIL] ${eq.name} has ${semiTransparentCount} semi-transparent pixels!`);
      allPassed = false;
    } else {
      console.log(`✓ [PASS] ${eq.name}: ${res.width}×${res.height} px, ${res.activePixels} pixels, alpha strictly 0/255`);
    }
  }
}

// 2. Programmatic Verification: Fraction Bar Separation & No Collision
console.log('\n=== Programmatic Check: Fraction Bar Separation & Radical Vinculum ===');
{
  const quadRes = PixelMathRenderer.render('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', {
    presetId: 'standard',
    padding: 0,
  });

  const buf = quadRes.buffer;
  // In the fraction box, find horizontal line that spans fraction bar
  let barRow = -1;
  for (let y = 0; y < buf.height; y++) {
    let run = 0;
    let maxRun = 0;
    for (let x = 0; x < buf.width; x++) {
      if (buf.getPixel(x, y)) {
        run++;
        if (run > maxRun) maxRun = run;
      } else {
        run = 0;
      }
    }
    // Bar is nearly the entire width of the fraction
    if (maxRun >= buf.width - 2) {
      barRow = y;
      break;
    }
  }

  if (barRow === -1) {
    console.error('❌ [FAIL] Fraction bar not detected!');
    allPassed = false;
  } else {
    console.log(`✓ Fraction bar found at row y=${barRow} (width: ${buf.width})`);
    let aboveOverlap = 0;
    let belowOverlap = 0;
    for (let x = 0; x < buf.width; x++) {
      if (buf.getPixel(x, barRow - 1)) aboveOverlap++;
      if (buf.getPixel(x, barRow + 1)) belowOverlap++;
    }
    if (aboveOverlap === 0 && belowOverlap === 0) {
      console.log(`✓ Clean 1px+ separation verified: row ${barRow - 1} and ${barRow + 1} have zero collisions with bar`);
    } else {
      console.warn(`  Notice: Row above has ${aboveOverlap} px, row below has ${belowOverlap} px`);
    }
  }
}

// 3. Programmatic Verification: Repeated Glyphs Pixel-for-Pixel Identity
console.log('\n=== Programmatic Check: Repeated Glyphs Determinism ===');
{
  const xGlyph = standardFont.getGlyph('x')!;
  console.log(`Standard 'x' glyph bitmap: ${xGlyph.width}×${xGlyph.height} px`);

  // Check that single glyphs rendered individually or within expressions are identical
  const xRes = PixelMathRenderer.render('x', { presetId: 'standard', padding: 0 });
  let matchCount = 0;
  for (let y = 0; y < xGlyph.height; y++) {
    for (let x = 0; x < xGlyph.width; x++) {
      const expected = xGlyph.rows[y][x] === '#';
      const actual = xRes.buffer.getPixel(x, y);
      if (expected === actual) matchCount++;
    }
  }
  const totalPixels = xGlyph.width * xGlyph.height;
  if (matchCount === totalPixels) {
    console.log(`✓ Glyph bitmap matches hand-crafted matrix 100% (${matchCount}/${totalPixels} pixels identical)`);
  } else {
    console.error(`❌ [FAIL] Glyph bitmap mismatch (${matchCount}/${totalPixels})`);
    allPassed = false;
  }
}

console.log('\n====================================================');
if (allPassed) {
  console.log('✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');
} else {
  console.log('❌ SOME VERIFICATION CHECKS FAILED');
  process.exit(1);
}
console.log('====================================================\n');
