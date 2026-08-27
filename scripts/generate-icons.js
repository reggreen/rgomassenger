const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'icon.svg');
  const maskableSvgPath = path.join(publicDir, 'icon-maskable.svg');

  const svgBuffer = fs.readFileSync(svgPath);
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath);

  console.log('Generating PNG icons...');

  // Standard icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16.png'));

  // Maskable icons (for Android adaptive launcher icons)
  await sharp(maskableSvgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-maskable-192.png'));
  await sharp(maskableSvgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
