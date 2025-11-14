const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const PUBLIC_DIR = path.join(__dirname, "..", "public");

async function generateIcons() {
  // Ensure directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Generate all sizes from SVG
  for (const size of SIZES) {
    await sharp(path.join(PUBLIC_DIR, "logo.svg"))
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC_DIR, `icon-${size}x${size}.png`));
  }

  // Generate screenshot examples
  await sharp(path.join(PUBLIC_DIR, "logo.svg"))
    .resize(1920, 1080)
    .png()
    .toFile(path.join(PUBLIC_DIR, "screenshot-desktop.png"));

  await sharp(path.join(PUBLIC_DIR, "logo.svg"))
    .resize(390, 844)
    .png()
    .toFile(path.join(PUBLIC_DIR, "screenshot-mobile.png"));
}

generateIcons().catch(console.error);
