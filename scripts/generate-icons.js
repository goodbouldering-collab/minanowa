const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'favicon.svg');
const svg = fs.readFileSync(svgPath);

const targets = [
  { out: 'apple-touch-icon.png', size: 180 },
  { out: 'icon-192.png', size: 192 },
  { out: 'icon-512.png', size: 512 },
];

(async () => {
  for (const t of targets) {
    const outPath = path.join(__dirname, '..', t.out);
    await sharp(svg, { density: 512 })
      .resize(t.size, t.size)
      .png()
      .toFile(outPath);
    console.log(`generated: ${t.out} (${t.size}x${t.size})`);
  }
})();
