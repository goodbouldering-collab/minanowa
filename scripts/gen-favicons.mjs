import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Vercel は outputDirectory='.' でリポルートを配信するため、ファビコン類はリポルート直下に置く。
const root = process.cwd();
const svgPath = path.join(root, 'favicon.svg');
const svg = fs.readFileSync(svgPath);

const targets = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 32,  file: 'favicon-32.png' },
  { size: 16,  file: 'favicon-16.png' }
];

for (const t of targets) {
  const out = path.join(root, t.file);
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const stat = fs.statSync(out);
  console.log(`${t.file.padEnd(24)} ${t.size}x${t.size}  ${stat.size} bytes`);
}

console.log('done.');
