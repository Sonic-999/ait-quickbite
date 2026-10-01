import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'public');
const iconsDir = path.resolve(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generates a PNG Buffer with width, height, and pixel drawing function
 */
function generatePNG(width, height, pixelShader) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      rawBytes[offset++] = Math.min(255, Math.max(0, Math.round(r)));
      rawBytes[offset++] = Math.min(255, Math.max(0, Math.round(g)));
      rawBytes[offset++] = Math.min(255, Math.max(0, Math.round(b)));
      rawBytes[offset++] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }

  const deflated = zlib.deflateSync(rawBytes, { level: 9 });
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Shader for QuickBite App Icon
 * Brand color: #6b21a8 (RGB: 107, 33, 168)
 * Deep Purple: #4c1d95 (RGB: 76, 29, 149)
 * Amber Accent: #f59e0b (RGB: 245, 158, 11)
 * White: #ffffff
 */
function quickBiteShader(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;
  const cornerRadius = width * 0.22;

  // Normalized coordinates [-1, 1]
  const nx = (x - cx) / cx;
  const ny = (y - cy) / cy;
  const dist = Math.hypot(nx, ny);

  let bgR = 107; // #6b21a8
  let bgG = 33;
  let bgB = 168;

  // Radial gradient: lighter purple in center, deep royal purple near edges
  const grad = Math.min(1, Math.hypot(nx, ny - 0.15) * 0.85);
  bgR = Math.round(130 * (1 - grad) + 76 * grad);
  bgG = Math.round(45 * (1 - grad) + 20 * grad);
  bgB = Math.round(200 * (1 - grad) + 140 * grad);

  if (!isMaskable) {
    // Rounded squircle mask for standard icon
    const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
    const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
    const cornerDist = Math.hypot(qx, qy);
    if (cornerDist > cornerRadius) {
      const alphaFalloff = Math.max(0, Math.min(1, 1 - (cornerDist - cornerRadius)));
      return [0, 0, 0, alphaFalloff * 255];
    }
  }

  // Draw Lightning / Speed Pre-order motif & Food Cloche / Cup
  // Draw glowing golden lightning bolt in center
  const scale = width / 192;
  const lx = (x - cx) / scale;
  const ly = (y - cy) / scale;

  // Draw cup / burger / fork / lightning
  // Center lightning bolt coordinates:
  // Points: (4, -40), (-25, 2), (2, 2), (-8, 42), (25, -4), (-2, -4)
  let insideLightning = false;

  // Simplified polygonal test for lightning bolt
  const poly = [
    [5, -38],
    [-22, 4],
    [2, 4],
    [-6, 42],
    [24, -2],
    [0, -2],
  ];

  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > ly) !== (yj > ly)) && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  insideLightning = inside;

  // Subtle circular glow behind lightning
  const centerGlow = Math.max(0, 1 - Math.hypot(lx, ly) / 50);

  if (insideLightning) {
    // Golden gradient for lightning bolt (#fbbf24 to #f59e0b)
    const boltY = (ly + 40) / 80;
    const r = Math.round(255 * (1 - boltY) + 245 * boltY);
    const g = Math.round(215 * (1 - boltY) + 158 * boltY);
    const b = Math.round(70 * (1 - boltY) + 11 * boltY);
    return [r, g, b, 255];
  }

  // Outer circular border accent
  const ringDist = Math.abs(Math.hypot(lx, ly) - 64);
  if (ringDist < 2.5) {
    const ringAlpha = Math.max(0, 1 - ringDist / 2.5);
    const blend = ringAlpha * 0.4;
    return [
      Math.round(bgR * (1 - blend) + 255 * blend),
      Math.round(bgG * (1 - blend) + 255 * blend),
      Math.round(bgB * (1 - blend) + 255 * blend),
      255,
    ];
  }

  // Center subtle ambient glow
  if (centerGlow > 0) {
    const glowBlend = centerGlow * 0.25;
    return [
      Math.round(bgR * (1 - glowBlend) + 250 * glowBlend),
      Math.round(bgG * (1 - glowBlend) + 200 * glowBlend),
      Math.round(bgB * (1 - glowBlend) + 255 * glowBlend),
      255,
    ];
  }

  return [bgR, bgG, bgB, 255];
}

console.log('Generating PWA standard and maskable icons...');

// 1. 192x192 Standard
const icon192 = generatePNG(192, 192, (x, y, w, h) => quickBiteShader(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), icon192);
console.log('✓ Created public/icons/icon-192x192.png');

// 2. 192x192 Maskable
const icon192Maskable = generatePNG(192, 192, (x, y, w, h) => quickBiteShader(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-192x192-maskable.png'), icon192Maskable);
console.log('✓ Created public/icons/icon-192x192-maskable.png');

// 3. 512x512 Standard
const icon512 = generatePNG(512, 512, (x, y, w, h) => quickBiteShader(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), icon512);
console.log('✓ Created public/icons/icon-512x512.png');

// 4. 512x512 Maskable
const icon512Maskable = generatePNG(512, 512, (x, y, w, h) => quickBiteShader(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512-maskable.png'), icon512Maskable);
console.log('✓ Created public/icons/icon-512x512-maskable.png');

// 5. 180x180 Apple Touch Icon
const iconApple = generatePNG(180, 180, (x, y, w, h) => quickBiteShader(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), iconApple);
console.log('✓ Created public/apple-touch-icon.png');

// 6. SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="40%" stop-color="#6b21a8"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- App Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Outer Accent Ring -->
  <circle cx="256" cy="256" r="176" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.25"/>
  <circle cx="256" cy="256" r="192" fill="none" stroke="#ffffff" stroke-dasharray="8 16" stroke-width="3" opacity="0.18"/>
  
  <!-- Subtle Food Plate / Halo -->
  <circle cx="256" cy="256" r="136" fill="#ffffff" opacity="0.08"/>
  
  <!-- Central Dynamic Speed Bolt -->
  <path d="M266 142 L206 262 L260 262 L244 372 L320 242 L256 242 Z"
        fill="url(#boltGrad)"
        filter="url(#glow)"/>
        
  <!-- QuickBite Brand Star Sparkles -->
  <circle cx="330" cy="170" r="8" fill="#fde047" opacity="0.9"/>
  <circle cx="180" cy="340" r="6" fill="#fde047" opacity="0.8"/>
  <circle cx="340" cy="320" r="5" fill="#ffffff" opacity="0.7"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);
console.log('✓ Created public/icons/icon.svg and public/favicon.svg');

console.log('All PWA icons generated successfully!');
