import { PixelBuffer, type RGBAColor } from './bitmap';

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf: Uint8Array, offset: number, length: number): number {
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

export function encodePng(buffer: PixelBuffer, fgColor: RGBAColor, bgColor?: RGBAColor): Uint8Array {
  const width = buffer.width;
  const height = buffer.height;

  // Each scanline: 1 byte filter (0 = None) + width * 4 bytes RGBA
  const bytesPerScanline = 1 + width * 4;
  const rawData = new Uint8Array(height * bytesPerScanline);

  let rawIdx = 0;
  for (let y = 0; y < height; y++) {
    rawData[rawIdx++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const active = buffer.getPixel(x, y);
      if (active) {
        rawData[rawIdx++] = fgColor.r;
        rawData[rawIdx++] = fgColor.g;
        rawData[rawIdx++] = fgColor.b;
        rawData[rawIdx++] = fgColor.a;
      } else if (bgColor && bgColor.a > 0) {
        rawData[rawIdx++] = bgColor.r;
        rawData[rawIdx++] = bgColor.g;
        rawData[rawIdx++] = bgColor.b;
        rawData[rawIdx++] = bgColor.a;
      } else {
        rawData[rawIdx++] = 0;
        rawData[rawIdx++] = 0;
        rawData[rawIdx++] = 0;
        rawData[rawIdx++] = 0;
      }
    }
  }

  // Deflate uncompressed blocks (RFC 1951) wrapped in zlib container (RFC 1950)
  // Max block size = 65535
  const maxBlockSize = 65535;
  const numBlocks = Math.ceil(rawData.length / maxBlockSize) || 1;
  let zlibLen = 2 + rawData.length + numBlocks * 5 + 4;
  const zlibData = new Uint8Array(zlibLen);

  // CMF and FLG
  zlibData[0] = 0x78; // Deflate, 32K window
  zlibData[1] = 0x01; // Check bits (0x7801 % 31 == 0)

  let zIdx = 2;
  let rawOffset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const isLast = b === numBlocks - 1 ? 1 : 0;
    const blockSize = Math.min(maxBlockSize, rawData.length - rawOffset);

    zlibData[zIdx++] = isLast ? 0x01 : 0x00; // BFINAL, BTYPE=00 (uncompressed)
    zlibData[zIdx++] = blockSize & 0xff;
    zlibData[zIdx++] = (blockSize >> 8) & 0xff;
    const nlen = (~blockSize) & 0xffff;
    zlibData[zIdx++] = nlen & 0xff;
    zlibData[zIdx++] = (nlen >> 8) & 0xff;

    zlibData.set(rawData.subarray(rawOffset, rawOffset + blockSize), zIdx);
    zIdx += blockSize;
    rawOffset += blockSize;
  }

  // Adler32
  const adler = adler32(rawData);
  zlibData[zIdx++] = (adler >> 24) & 0xff;
  zlibData[zIdx++] = (adler >> 16) & 0xff;
  zlibData[zIdx++] = (adler >> 8) & 0xff;
  zlibData[zIdx++] = adler & 0xff;

  // Build PNG chunks:
  // Signature (8 bytes) + IHDR (25 bytes) + IDAT (12 + zlibLen bytes) + IEND (12 bytes)
  const totalPngSize = 8 + 25 + (12 + zlibData.length) + 12;
  const png = new Uint8Array(totalPngSize);

  // Signature
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  let pIdx = 8;

  function writeChunk(type: string, data: Uint8Array): void {
    const len = data.length;
    // Length (4 bytes big-endian)
    png[pIdx++] = (len >> 24) & 0xff;
    png[pIdx++] = (len >> 16) & 0xff;
    png[pIdx++] = (len >> 8) & 0xff;
    png[pIdx++] = len & 0xff;

    const chunkStart = pIdx;
    // Chunk type (4 bytes ASCII)
    for (let i = 0; i < 4; i++) {
      png[pIdx++] = type.charCodeAt(i);
    }
    // Chunk data
    png.set(data, pIdx);
    pIdx += len;

    // CRC32 over type + data
    const crc = crc32(png, chunkStart, len + 4);
    png[pIdx++] = (crc >> 24) & 0xff;
    png[pIdx++] = (crc >> 16) & 0xff;
    png[pIdx++] = (crc >> 8) & 0xff;
    png[pIdx++] = crc & 0xff;
  }

  // IHDR data
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >> 24) & 0xff;
  ihdr[1] = (width >> 16) & 0xff;
  ihdr[2] = (width >> 8) & 0xff;
  ihdr[3] = width & 0xff;
  ihdr[4] = (height >> 24) & 0xff;
  ihdr[5] = (height >> 16) & 0xff;
  ihdr[6] = (height >> 8) & 0xff;
  ihdr[7] = height & 0xff;
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression method: 0
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace method: 0
  writeChunk('IHDR', ihdr);

  // IDAT chunk
  writeChunk('IDAT', zlibData);

  // IEND chunk
  writeChunk('IEND', new Uint8Array(0));

  return png;
}

export function pngToDataUrl(pngBytes: Uint8Array): string {
  let binary = '';
  const len = pngBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pngBytes[i]);
  }
  return 'data:image/png;base64,' + btoa(binary);
}
