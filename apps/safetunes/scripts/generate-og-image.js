import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('./public/og-image.svg');

sharp(svgBuffer)
  .resize(1200, 630)
  .png()
  .toFile('./public/og-image.png')
  .then(() => {
    console.log('✅ og-image.png created successfully!');
    console.log('📊 Size: 1200x630px');
    console.log('📍 Location: /public/og-image.png');
  })
  .catch(err => {
    console.error('Error creating og-image.png:', err);
  });
