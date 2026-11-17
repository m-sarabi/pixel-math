import './style.css';
import { PixelMathRenderer, type RenderResult } from './engine/renderer';
import { PALETTE_TABS, TEMPLATES } from './ui/palette-data';
import type { RGBAColor } from './engine/bitmap';

function hexToRgba(hex: string, alpha: number = 255): RGBAColor {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: alpha,
  };
}

// App State (Locked to Standard 7x9 Font)
interface AppState {
  latex: string;
  padding: number;
  fgHex: string;
  bgHex: string | null;
  zoom: number;
  showGrid: boolean;
  viewportBg: 'checkerboard' | 'solid-black' | 'solid-white';
  activeTab: string;
}

const STORAGE_KEY = 'pixelmath_user_prefs_v1';

function loadPersistedState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return {};
}

const savedState = loadPersistedState();

const state: AppState = {
  latex: typeof savedState.latex === 'string' ? savedState.latex : '\\sin^2 x + \\cos^2 x = 1',
  padding: typeof savedState.padding === 'number' ? savedState.padding : 2,
  fgHex: typeof savedState.fgHex === 'string' ? savedState.fgHex : '#ffffff',
  bgHex: savedState.bgHex !== undefined ? savedState.bgHex : null,
  zoom: typeof savedState.zoom === 'number' ? savedState.zoom : 8,
  showGrid: typeof savedState.showGrid === 'boolean' ? savedState.showGrid : true,
  viewportBg: ['checkerboard', 'solid-black', 'solid-white'].includes(savedState.viewportBg as any)
    ? (savedState.viewportBg as any)
    : 'checkerboard',
  activeTab: typeof savedState.activeTab === 'string' ? savedState.activeTab : 'structures',
};

function persistState(): void {
  try {
    const toSave: Partial<AppState> = {
      latex: state.latex,
      padding: state.padding,
      fgHex: state.fgHex,
      bgHex: state.bgHex,
      zoom: state.zoom,
      showGrid: state.showGrid,
      viewportBg: state.viewportBg,
      activeTab: state.activeTab,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to persist settings:', e);
  }
}

let currentResult: RenderResult | null = null;

// Build UI DOM
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="app-header">
    <div class="logo-container">
      <div class="logo-icon">∑</div>
      <div class="logo-text">
        <h1>PixelMath</h1>
      </div>
    </div>
    <div class="header-actions">
      <a href="https://github.com/m-sarabi/pixel-math" target="_blank" rel="noopener" class="header-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        GitHub
      </a>
    </div>
  </header>

  <main class="app-main">
    <!-- Left Editor & Controls Panel -->
    <aside class="editor-panel">
      <!-- Templates Card -->
      <div class="section-card">
        <div class="section-title">
          <span>Preset Equations</span>
          <span style="font-size: 0.7rem; color: var(--text-muted)">Gallery</span>
        </div>
        <select id="templateSelect" class="template-select">
          <option value="">-- Load an Equation Template --</option>
          ${TEMPLATES.map(t => `<option value="${t.latex}">${t.name} (${t.desc})</option>`).join('')}
        </select>
      </div>

      <!-- LaTeX Formula Editor Card -->
      <div class="section-card">
        <div class="section-title">
          <span>LaTeX Formula</span>
          <span style="font-size: 0.7rem; color: var(--text-muted)">TeX Box Engine</span>
        </div>
        <div class="editor-wrapper">
          <textarea id="formulaInput" class="formula-input" spellcheck="false">${state.latex}</textarea>
          <div id="errorBanner" class="error-banner"></div>
        </div>
      </div>

      <!-- Symbol Cheat-Sheet Drawer Card -->
      <div class="section-card">
        <div class="section-title">
          <span>Symbol Palette</span>
          <span style="font-size: 0.7rem; color: var(--text-muted)">Click to Insert</span>
        </div>
        <div class="palette-tabs-nav" id="paletteTabs">
          ${PALETTE_TABS.map(tab => `
            <button type="button" class="tab-btn ${tab.id === state.activeTab ? 'active' : ''}" data-tab="${tab.id}">
              ${tab.title}
            </button>
          `).join('')}
        </div>
        <div class="palette-grid" id="paletteGrid"></div>
      </div>

      <!-- Formatting & Color Settings Card -->
      <div class="section-card">
        <div class="section-title">
          <span>Formatting & Palette</span>
          <span style="font-size: 0.7rem; color: var(--text-muted)">Strict 1-Bit Alpha</span>
        </div>
        
        <div class="setting-row">
          <span class="setting-label">Border Padding</span>
          <div class="preset-pill-group" id="paddingGroup">
            <button type="button" class="preset-pill ${state.padding === 0 ? 'active' : ''}" data-pad="0">0px</button>
            <button type="button" class="preset-pill ${state.padding === 1 ? 'active' : ''}" data-pad="1">1px</button>
            <button type="button" class="preset-pill ${state.padding === 2 ? 'active' : ''}" data-pad="2">2px</button>
            <button type="button" class="preset-pill ${state.padding === 4 ? 'active' : ''}" data-pad="4">4px</button>
            <button type="button" class="preset-pill ${state.padding === 8 ? 'active' : ''}" data-pad="8">8px</button>
          </div>
        </div>

        <div class="setting-row" style="margin-top: 0.25rem;">
          <span class="setting-label">Ink Color</span>
          <div class="swatches-row" id="fgSwatches">
            <button type="button" class="color-swatch ${state.fgHex === '#ffffff' ? 'active' : ''}" data-color="#ffffff" style="background:#ffffff;" title="Pure White"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#000000' ? 'active' : ''}" data-color="#000000" style="background:#000000; border: 1px solid #444;" title="Pure Black"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#00f0ff' ? 'active' : ''}" data-color="#00f0ff" style="background:#00f0ff;" title="Cyber Cyan"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#ffb000' ? 'active' : ''}" data-color="#ffb000" style="background:#ffb000;" title="Amber CRT"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#8bac0f' ? 'active' : ''}" data-color="#8bac0f" style="background:#8bac0f;" title="GameBoy Green"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#ff0055' ? 'active' : ''}" data-color="#ff0055" style="background:#ff0055;" title="Neon Pink"></button>
            <button type="button" class="color-swatch ${state.fgHex === '#ffd700' ? 'active' : ''}" data-color="#ffd700" style="background:#ffd700;" title="Solar Gold"></button>
            <input type="color" id="fgCustom" class="custom-color-input" value="${state.fgHex}" title="Custom Hex">
          </div>
        </div>

        <div class="setting-row" style="margin-top: 0.25rem;">
          <span class="setting-label">Background</span>
          <div class="preset-pill-group" id="bgGroup">
            <button type="button" class="preset-pill ${state.bgHex === null ? 'active' : ''}" data-bg="null">Transparent</button>
            <button type="button" class="preset-pill ${state.bgHex === '#000000' ? 'active' : ''}" data-bg="#000000">Black</button>
            <button type="button" class="preset-pill ${state.bgHex === '#ffffff' ? 'active' : ''}" data-bg="#ffffff">White</button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right Canvas & Preview Panel -->
    <section class="preview-panel">
      <!-- Toolbar -->
      <div class="preview-toolbar">
        <div class="toolbar-group">
          <button type="button" id="zoomOutBtn" class="tool-btn" title="Zoom Out (4× min)">−</button>
          <span id="zoomReadout" class="zoom-label">${state.zoom}×</span>
          <button type="button" id="zoomInBtn" class="tool-btn" title="Zoom In (20× max)">+</button>
          <input type="range" id="zoomSlider" min="4" max="20" step="1" value="${state.zoom}" style="width: 90px; cursor: pointer;">
        </div>

        <div class="toolbar-group">
          <button type="button" id="toggleGridBtn" class="tool-btn ${state.showGrid ? 'active' : ''}" title="Toggle 1px Pixel Grid">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Grid Overlay
          </button>

          <button type="button" id="toggleCheckerBtn" class="tool-btn" title="Cycle Viewport Background">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/>
            </svg>
            Contrast
          </button>

          <button type="button" id="resetZoomBtn" class="tool-btn" title="Reset Zoom to 8×">
            1:1 Reset
          </button>
        </div>
      </div>

      <!-- Viewport Stage -->
      <div class="canvas-viewport ${state.viewportBg}" id="canvasViewport">
        <div class="canvas-stage" id="canvasStage">
          <canvas id="pixelCanvas"></canvas>
          <svg id="gridOverlay" class="pixel-grid-overlay visible"></svg>
        </div>
      </div>

      <!-- Footer: Metrics & Export Actions -->
      <footer class="preview-footer">
        <div class="stats-badges">
          <div class="stat-item">
            <span class="stat-name">Dimensions</span>
            <span id="statDimensions" class="stat-val accent">0 × 0 px</span>
          </div>
          <div class="stat-item">
            <span class="stat-name">Active Pixels</span>
            <span id="statActive" class="stat-val">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-name">Density</span>
            <span id="statDensity" class="stat-val">0%</span>
          </div>
        </div>

        <div class="action-buttons">
          <button type="button" id="copyPngBtn" class="btn-secondary" title="Copy 1:1 PNG to Clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy PNG
          </button>

          <button type="button" id="downloadPngBtn" class="btn-primary" title="Download Crisp 1:1 1-bit PNG">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PNG (1:1)
          </button>
        </div>
      </footer>
    </section>
  </main>

  <div id="toastContainer" class="toast-container"></div>
`;

// Elements
const formulaInput = document.getElementById('formulaInput') as HTMLTextAreaElement;
const errorBanner = document.getElementById('errorBanner') as HTMLDivElement;
const templateSelect = document.getElementById('templateSelect') as HTMLSelectElement;
const paletteTabs = document.getElementById('paletteTabs') as HTMLDivElement;
const paletteGrid = document.getElementById('paletteGrid') as HTMLDivElement;
const paddingGroup = document.getElementById('paddingGroup') as HTMLDivElement;
const fgSwatches = document.getElementById('fgSwatches') as HTMLDivElement;
const fgCustom = document.getElementById('fgCustom') as HTMLInputElement;
const bgGroup = document.getElementById('bgGroup') as HTMLDivElement;

const zoomOutBtn = document.getElementById('zoomOutBtn') as HTMLButtonElement;
const zoomInBtn = document.getElementById('zoomInBtn') as HTMLButtonElement;
const zoomSlider = document.getElementById('zoomSlider') as HTMLInputElement;
const zoomReadout = document.getElementById('zoomReadout') as HTMLSpanElement;
const toggleGridBtn = document.getElementById('toggleGridBtn') as HTMLButtonElement;
const toggleCheckerBtn = document.getElementById('toggleCheckerBtn') as HTMLButtonElement;
const resetZoomBtn = document.getElementById('resetZoomBtn') as HTMLButtonElement;

const canvasViewport = document.getElementById('canvasViewport') as HTMLDivElement;
const canvasStage = document.getElementById('canvasStage') as HTMLDivElement;
const pixelCanvas = document.getElementById('pixelCanvas') as HTMLCanvasElement;
const gridOverlay = document.getElementById('gridOverlay') as unknown as SVGSVGElement;

const statDimensions = document.getElementById('statDimensions') as HTMLSpanElement;
const statActive = document.getElementById('statActive') as HTMLSpanElement;
const statDensity = document.getElementById('statDensity') as HTMLSpanElement;

const copyPngBtn = document.getElementById('copyPngBtn') as HTMLButtonElement;
const downloadPngBtn = document.getElementById('downloadPngBtn') as HTMLButtonElement;
const toastContainer = document.getElementById('toastContainer') as HTMLDivElement;

// Toast helper
function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// Render Palette Grid for active tab
function renderPaletteGrid(): void {
  const currentTab = PALETTE_TABS.find(t => t.id === state.activeTab) || PALETTE_TABS[0];
  paletteGrid.innerHTML = currentTab.items.map(item => `
    <button type="button" class="palette-btn" data-insert="${item.insert.replace(/"/g, '&quot;')}" title="${item.desc || item.label}">
      ${item.label}
    </button>
  `).join('');
}

// Insert symbol into formula input at cursor
function insertAtCursor(text: string): void {
  const start = formulaInput.selectionStart;
  const end = formulaInput.selectionEnd;
  const val = formulaInput.value;
  formulaInput.value = val.substring(0, start) + text + val.substring(end);
  const newPos = start + text.length;
  formulaInput.setSelectionRange(newPos, newPos);
  formulaInput.focus();
  state.latex = formulaInput.value;
  persistState();
  updateRender();
}

// Core Render Logic
function updateRender(): void {
  try {
    const fgRgba = hexToRgba(state.fgHex, 255);
    const bgRgba = state.bgHex ? hexToRgba(state.bgHex, 255) : undefined;

    currentResult = PixelMathRenderer.render(state.latex, {
      presetId: 'standard',
      padding: state.padding,
      fgColor: fgRgba,
      bgColor: bgRgba,
    });

    errorBanner.style.display = 'none';

    // Update 1:1 Canvas
    pixelCanvas.width = currentResult.width;
    pixelCanvas.height = currentResult.height;
    const ctx = pixelCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const imgData = currentResult.buffer.toImageData(fgRgba, bgRgba);
    ctx.putImageData(imgData, 0, 0);

    // Apply scale & dimensions to stage
    applyZoom();

    // Update Stats
    statDimensions.textContent = `${currentResult.width} × ${currentResult.height} px`;
    statActive.textContent = `${currentResult.activePixels}`;
    const totalPixels = currentResult.width * currentResult.height;
    const density = totalPixels > 0 ? ((currentResult.activePixels / totalPixels) * 100).toFixed(1) : '0';
    statDensity.textContent = `${density}%`;
  } catch (err: any) {
    console.error('Render error:', err);
    errorBanner.textContent = `Parse error: ${err.message || err}`;
    errorBanner.style.display = 'block';
  }
}

// Apply zoom and pixel grid overlay
function applyZoom(): void {
  if (!currentResult) return;
  const z = state.zoom;
  zoomReadout.textContent = `${z}×`;
  zoomSlider.value = `${z}`;

  const w = currentResult.width;
  const h = currentResult.height;

  const displayW = w * z;
  const displayH = h * z;

  pixelCanvas.style.width = `${displayW}px`;
  pixelCanvas.style.height = `${displayH}px`;
  canvasStage.style.width = `${displayW}px`;
  canvasStage.style.height = `${displayH}px`;

  // Draw 1px pixel grid if enabled and zoom >= 2
  if (state.showGrid && z >= 2) {
    gridOverlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
    gridOverlay.style.width = `${displayW}px`;
    gridOverlay.style.height = `${displayH}px`;
    gridOverlay.classList.add('visible');

    let gridPaths = '';
    for (let x = 1; x < w; x++) {
      gridPaths += `M${x} 0 L${x} ${h} `;
    }
    for (let y = 1; y < h; y++) {
      gridPaths += `M0 ${y} L${w} ${y} `;
    }

    gridOverlay.innerHTML = `
      <path d="${gridPaths}" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1" vector-effect="non-scaling-stroke" />
    `;
  } else {
    gridOverlay.classList.remove('visible');
    gridOverlay.innerHTML = '';
  }
}

// Event Listeners
formulaInput.addEventListener('input', () => {
  state.latex = formulaInput.value;
  persistState();
  updateRender();
});

templateSelect.addEventListener('change', () => {
  if (templateSelect.value) {
    formulaInput.value = templateSelect.value;
    state.latex = templateSelect.value;
    persistState();
    updateRender();
    templateSelect.value = '';
  }
});

// Click-draggable Palette tabs
let isPaletteDragging = false;
let paletteStartX = 0;
let paletteScrollLeft = 0;
let paletteDraggedDistance = 0;

paletteTabs.addEventListener('mousedown', (e) => {
  isPaletteDragging = true;
  paletteDraggedDistance = 0;
  paletteStartX = e.pageX - paletteTabs.offsetLeft;
  paletteScrollLeft = paletteTabs.scrollLeft;
  paletteTabs.classList.add('dragging');
});

window.addEventListener('mouseup', () => {
  if (isPaletteDragging) {
    isPaletteDragging = false;
    paletteTabs.classList.remove('dragging');
  }
});

paletteTabs.addEventListener('mouseleave', () => {
  if (isPaletteDragging) {
    isPaletteDragging = false;
    paletteTabs.classList.remove('dragging');
  }
});

paletteTabs.addEventListener('mousemove', (e) => {
  if (!isPaletteDragging) return;
  e.preventDefault();
  const x = e.pageX - paletteTabs.offsetLeft;
  const walk = (x - paletteStartX);
  paletteDraggedDistance += Math.abs(walk);
  paletteTabs.scrollLeft = paletteScrollLeft - walk;
});

paletteTabs.addEventListener('click', (e) => {
  if (paletteDraggedDistance > 5) {
    return;
  }
  const target = (e.target as HTMLElement).closest('.tab-btn') as HTMLButtonElement | null;
  if (target && target.dataset.tab) {
    state.activeTab = target.dataset.tab;
    paletteTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    persistState();
    renderPaletteGrid();
  }
});

paletteGrid.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.palette-btn') as HTMLButtonElement | null;
  if (target && target.dataset.insert) {
    insertAtCursor(target.dataset.insert);
  }
});

// Padding
paddingGroup.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.preset-pill') as HTMLButtonElement | null;
  if (target && target.dataset.pad !== undefined) {
    state.padding = parseInt(target.dataset.pad, 10);
    paddingGroup.querySelectorAll('.preset-pill').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    persistState();
    updateRender();
  }
});

// Ink color swatches
fgSwatches.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.color-swatch') as HTMLButtonElement | null;
  if (target && target.dataset.color) {
    state.fgHex = target.dataset.color;
    fgSwatches.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    fgCustom.value = state.fgHex;
    persistState();
    updateRender();
  }
});

fgCustom.addEventListener('input', () => {
  state.fgHex = fgCustom.value;
  fgSwatches.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
  persistState();
  updateRender();
});

// Background options
bgGroup.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.preset-pill') as HTMLButtonElement | null;
  if (target && target.dataset.bg !== undefined) {
    const val = target.dataset.bg;
    state.bgHex = val === 'null' ? null : val;
    bgGroup.querySelectorAll('.preset-pill').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    persistState();
    updateRender();
  }
});

// Zoom controls
zoomInBtn.addEventListener('click', () => {
  if (state.zoom < 20) {
    state.zoom = Math.min(20, state.zoom + 2);
    persistState();
    applyZoom();
  }
});

zoomOutBtn.addEventListener('click', () => {
  if (state.zoom > 4) {
    state.zoom = Math.max(4, state.zoom - 2);
    persistState();
    applyZoom();
  }
});

zoomSlider.addEventListener('input', () => {
  state.zoom = parseInt(zoomSlider.value, 10);
  persistState();
  applyZoom();
});

resetZoomBtn.addEventListener('click', () => {
  state.zoom = 8;
  persistState();
  applyZoom();
});

toggleGridBtn.addEventListener('click', () => {
  state.showGrid = !state.showGrid;
  toggleGridBtn.classList.toggle('active', state.showGrid);
  persistState();
  applyZoom();
});

// Toggle contrast background in viewport
const bgModes: Array<AppState['viewportBg']> = ['checkerboard', 'solid-black', 'solid-white'];
toggleCheckerBtn.addEventListener('click', () => {
  const curIdx = bgModes.indexOf(state.viewportBg);
  const nextIdx = (curIdx + 1) % bgModes.length;
  state.viewportBg = bgModes[nextIdx];

  canvasViewport.classList.remove('checkerboard', 'solid-black', 'solid-white');
  canvasViewport.classList.add(state.viewportBg);
  persistState();
});

export function getDownloadFilename(formula: string): string {
  const simplified = formula
    .replace(/\\[a-zA-Z]+/g, (m) => m.slice(1))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || 'formula';

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  return `pixelmath_${simplified}_${dateStr}_${timeStr}.png`;
}

// Download 1:1 PNG
downloadPngBtn.addEventListener('click', () => {
  if (!currentResult) return;
  const blob = new Blob([currentResult.pngBytes as any], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getDownloadFilename(state.latex);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${currentResult.width}×${currentResult.height} PNG!`);
});

// Copy PNG to Clipboard
copyPngBtn.addEventListener('click', async () => {
  if (!currentResult) return;
  try {
    const blob = new Blob([currentResult.pngBytes as any], { type: 'image/png' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    showToast('PNG copied to clipboard!');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    try {
      await navigator.clipboard.writeText(currentResult.dataUrl);
      showToast('Copied PNG Data URL!');
    } catch {
      showToast('Clipboard access denied.');
    }
  }
});

// Initial Setup
renderPaletteGrid();
updateRender();
