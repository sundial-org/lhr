import { chromium } from '/Users/turboblitz/code/my-code/sundial-v2/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const DIR = '/Users/turboblitz/code/my-code/sundial-v2/.claude/worktrees/adoring-swartz-c3ace2/tmp/designs/round2/horizon/assets';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2500, height: 1600 } });
await page.goto('file://' + DIR + '/painter.html');
await page.waitForFunction('window.PAINT_DONE === true', { timeout: 120000 });

function save(name, dataUrl) {
  writeFileSync(DIR + '/' + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', name);
}

// full painting
save('hero-panorama.png', await page.evaluate(() => document.getElementById('c').toDataURL('image/png')));

// crops: [name, sx, sy, sw, sh]
const crops = [
  ['far-horizon.png', 300, 480, 2100, 620],     // luminous distance band for footer
  ['detail-river.png', 340, 620, 1720, 660],    // layered ridge + horizon light band
  ['detail-trees.png', 1750, 900, 650, 600],    // dark repoussoir trees
];
for (const [name, sx, sy, sw, sh] of crops) {
  const url = await page.evaluate(([sx, sy, sw, sh]) => {
    const src = document.getElementById('c');
    const c2 = document.createElement('canvas');
    c2.width = sw; c2.height = sh;
    c2.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    return c2.toDataURL('image/png');
  }, [sx, sy, sw, sh]);
  save(name, url);
}

await browser.close();
