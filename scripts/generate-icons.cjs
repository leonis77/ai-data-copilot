/**
 * Generate PWA icon PNG files — all sizes needed by browsers/devices.
 * Creates solid #6366F1 (indigo) icons.
 * Run: node scripts/generate-icons.cjs
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// Pre-computed CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const po = off + 1 + x * 3;
      raw[po] = r;
      raw[po + 1] = g;
      raw[po + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, createChunk("IHDR", ihdr), createChunk("IDAT", compressed), iend]);
}

const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const R = 99, G = 102, B = 241; // #6366F1 brand indigo

// All sizes needed for cross-browser + PWA support
const sizes = [
  { name: "favicon-16x16.png",      w: 16 },
  { name: "favicon-32x32.png",      w: 32 },
  { name: "apple-touch-icon.png",   w: 180 }, // iOS primary
  { name: "apple-touch-icon-120x120.png",  w: 120 },
  { name: "apple-touch-icon-152x152.png",  w: 152 },
  { name: "apple-touch-icon-180x180.png",  w: 180 },
  { name: "icon-192.png",           w: 192 }, // PWA
  { name: "icon-512.png",           w: 512 }, // PWA
  { name: "android-chrome-192x192.png", w: 192 },
  { name: "android-chrome-512x512.png", w: 512 },
];

for (const s of sizes) {
  const png = createPNG(s.w, s.w, R, G, B);
  fs.writeFileSync(path.join(publicDir, s.name), png);
  console.log("  %s (%d×%d, %d B)", s.name, s.w, s.w, png.length);
}

// Also create site.webmanifest (Firefox / some Android browsers look for this name)
const manifestSrc = path.join(__dirname, "..", "public", "manifest.json");
const manifestDst = path.join(__dirname, "..", "public", "site.webmanifest");
fs.copyFileSync(manifestSrc, manifestDst);
console.log("  site.webmanifest (copied from manifest.json)");
console.log("✅ All PWA icons + webmanifest generated");
