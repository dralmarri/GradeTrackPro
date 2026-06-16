import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const resourcesDir = path.join(root, 'resources');
const sourceIcon = path.join(resourcesDir, 'icon.png');
const outputSize = 2732;
// Splash is 2732x2732 and iOS LaunchScreen uses scaleAspectFill, cropping the
// square splash to screen height. Keep the icon small (~9% of splash width) so
// it renders around 18–20% of screen width on a typical iPhone.
const iconWidth = 260;
const lightBackground = '#0ea5e9';
const darkBackground = '#0f172a';

mkdirSync(resourcesDir, { recursive: true });

async function makeSplash(filename, background) {
  const icon = await sharp(sourceIcon)
    .resize({ width: iconWidth, height: iconWidth, fit: 'inside' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background,
    },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(path.join(resourcesDir, filename));
}

await makeSplash('splash.png', lightBackground);
await makeSplash('splash-dark.png', darkBackground);

console.log('Generated centered iOS splash sources with a small icon.');