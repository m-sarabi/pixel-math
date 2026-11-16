import type { PixelTarget } from './types';

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0 or 255 strictly for 1-bit
}

export class PixelBuffer implements PixelTarget {
  public width: number;
  public height: number;
  public data: Uint8Array; // 1 for active pixel, 0 for empty

  constructor(width: number, height: number, data?: Uint8Array) {
    this.width = Math.max(0, Math.floor(width));
    this.height = Math.max(0, Math.floor(height));
    if (data && data.length === this.width * this.height) {
      this.data = new Uint8Array(data);
    } else {
      this.data = new Uint8Array(this.width * this.height);
    }
  }

  public setPixel(x: number, y: number, value: boolean = true): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.data[y * this.width + x] = value ? 1 : 0;
    }
  }

  public getPixel(x: number, y: number): boolean {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.data[y * this.width + x] === 1;
    }
    return false;
  }

  public fillRect(x: number, y: number, w: number, h: number, value: boolean = true): void {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.floor(w);
    h = Math.floor(h);
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    const val = value ? 1 : 0;

    for (let py = y0; py < y1; py++) {
      const rowOffset = py * this.width;
      for (let px = x0; px < x1; px++) {
        this.data[rowOffset + px] = val;
      }
    }
  }

  public drawHLine(x: number, y: number, w: number, value: boolean = true): void {
    this.fillRect(x, y, w, 1, value);
  }

  public drawVLine(x: number, y: number, h: number, value: boolean = true): void {
    this.fillRect(x, y, 1, h, value);
  }

  public blit(source: PixelTarget, dstX: number, dstY: number): void {
    dstX = Math.floor(dstX);
    dstY = Math.floor(dstY);
    const sW = source.width;
    const sH = source.height;

    for (let sy = 0; sy < sH; sy++) {
      const targetY = dstY + sy;
      if (targetY < 0 || targetY >= this.height) continue;
      for (let sx = 0; sx < sW; sx++) {
        const targetX = dstX + sx;
        if (targetX < 0 || targetX >= this.width) continue;
        if (source.getPixel(sx, sy)) {
          this.data[targetY * this.width + targetX] = 1;
        }
      }
    }
  }

  public countActivePixels(): number {
    let count = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] === 1) count++;
    }
    return count;
  }

  public getBoundingBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[y * this.width + x] === 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1) return null;
    return { minX, minY, maxX, maxY };
  }

  /**
   * Return a cropped or padded clone of this buffer with exact padding around the content
   */
  public pad(padding: number): PixelBuffer {
    const bbox = this.getBoundingBox();
    if (!bbox) {
      // Empty buffer
      const size = Math.max(1, padding * 2);
      return new PixelBuffer(size, size);
    }

    const contentW = bbox.maxX - bbox.minX + 1;
    const contentH = bbox.maxY - bbox.minY + 1;
    const newW = contentW + padding * 2;
    const newH = contentH + padding * 2;
    const out = new PixelBuffer(newW, newH);

    for (let y = 0; y < contentH; y++) {
      for (let x = 0; x < contentW; x++) {
        if (this.getPixel(bbox.minX + x, bbox.minY + y)) {
          out.setPixel(padding + x, padding + y, true);
        }
      }
    }
    return out;
  }

  /**
   * Convert buffer into RGBA Uint8ClampedArray for Canvas ImageData.
   * alpha is strictly 0 or 255.
   */
  public toImageData(fgColor: RGBAColor, bgColor?: RGBAColor): ImageData {
    const arr = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.data.length; i++) {
      const idx = i * 4;
      if (this.data[i] === 1) {
        arr[idx] = fgColor.r;
        arr[idx + 1] = fgColor.g;
        arr[idx + 2] = fgColor.b;
        arr[idx + 3] = fgColor.a;
      } else if (bgColor && bgColor.a > 0) {
        arr[idx] = bgColor.r;
        arr[idx + 1] = bgColor.g;
        arr[idx + 2] = bgColor.b;
        arr[idx + 3] = bgColor.a;
      } else {
        arr[idx] = 0;
        arr[idx + 1] = 0;
        arr[idx + 2] = 0;
        arr[idx + 3] = 0; // strictly transparent
      }
    }
    return new ImageData(arr, this.width, this.height);
  }
}
