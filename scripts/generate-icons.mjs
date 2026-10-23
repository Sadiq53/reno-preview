import fs from "fs";
import path from "path";
import zlib from "zlib";

// CRC table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  // RGBA buffer: (size * 4 + 1) per line
  const scanlineSize = size * 4 + 1;
  const rawData = Buffer.alloc(scanlineSize * size);

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineSize;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center for rounded square base
      const dx = Math.abs(x - (size - 1) / 2);
      const dy = Math.abs(y - (size - 1) / 2);
      const half = (size - 1) / 2;
      const cornerDx = Math.max(0, dx - (half - radius));
      const cornerDy = Math.max(0, dy - (half - radius));
      const distCorner = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);

      if (distCorner > radius) {
        // Transparent outside rounded corner
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Inside rounded background: Royal Indigo Blue #224494 (34, 68, 148)
      let r = 34;
      let g = 68;
      let b = 148;
      let a = 255;

      // Draw Vanguard "V" emblem in Emerald Teal #29D698 (41, 214, 152) and White
      // Normalized coordinates [0, 1]
      const nx = x / size;
      const ny = y / size;

      // Outer Shield / V contour:
      // Point at bottom center: (0.5, 0.8)
      // Top left: (0.24, 0.26), Top right: (0.76, 0.26)
      // Inner V point: (0.5, 0.60)
      const vLeftDist = Math.abs(ny - (0.8 - (0.54 / 0.26) * Math.abs(nx - 0.5)));
      
      const inV =
        ny >= 0.26 &&
        ny <= 0.78 &&
        Math.abs(nx - 0.5) <= 0.30 &&
        ny >= (0.8 - (0.54 / 0.26) * Math.abs(nx - 0.5) - 0.16) &&
        ny <= (0.8 - (0.54 / 0.26) * Math.abs(nx - 0.5) + 0.04);

      // Check center chevron or emerald star/shield
      const isChevron =
        ny >= 0.30 &&
        ny <= 0.74 &&
        Math.abs(nx - 0.5) <= (0.80 - ny) * 0.72 &&
        Math.abs(nx - 0.5) >= (0.80 - ny) * 0.72 - 0.18;

      // Inner dot/accent at center top
      const isDot =
        Math.sqrt((nx - 0.5) ** 2 + (ny - 0.36) ** 2) < 0.08;

      if (isChevron) {
        // Emerald Teal #29D698
        r = 41;
        g = 214;
        b = 152;
      } else if (isDot) {
        // Crisp White center diamond / dot
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve("./extension/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = generatePng(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${pngBuf.length} bytes)`);
});
