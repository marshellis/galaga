'use strict';

const { PNG } = require('pngjs');
const fs      = require('fs');
const path    = require('path');

const OUT = path.join(__dirname, '..', 'client', 'public', 'assets');
fs.mkdirSync(OUT, { recursive: true });

function mkPng(w, h) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  png.data = Buffer.alloc(w * h * 4, 0); // all transparent
  return png;
}

function px(png, x, y, c) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = c[0]; png.data[i+1] = c[1]; png.data[i+2] = c[2]; png.data[i+3] = c[3];
}

function rect(png, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      px(png, x + dx, y + dy, c);
}

function ellipse(png, cx, cy, rx, ry, c) {
  const x0 = Math.ceil(cx - rx), x1 = Math.floor(cx + rx);
  const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if ((x - cx) ** 2 / rx / rx + (y - cy) ** 2 / ry / ry <= 1)
        px(png, x, y, c);
}

function save(png, name) {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log(`  wrote ${name} (${png.width}x${png.height})`);
}

// ── PLAYER SHIP (32x32) ──────────────────────────────────────────────────────
function genPlayer() {
  const p   = mkPng(32, 32);
  const B   = [26,  86,  255, 255]; // blue body
  const Lb  = [77,  138, 255, 255]; // light blue wings
  const R   = [255, 34,  34,  255]; // red cockpit
  const W   = [255, 255, 255, 255]; // white highlights
  const Or  = [255, 136, 0,   255]; // orange exhausts

  // Wings: sweep outward as y increases (triangle from y=10 to y=21)
  for (let y = 10; y <= 21; y++) {
    const spread = Math.floor((y - 10) * 0.75);
    for (let dx = 1; dx <= spread; dx++) {
      px(p, 15 - dx, y, Lb);
      px(p, 16 + dx, y, Lb);
    }
  }

  // Main body: narrow vertical strip nose→base
  rect(p, 14, 3,  4, 19, B);

  // Red cockpit
  rect(p, 15, 4,  2,  3, R);

  // White body highlights
  px(p, 15, 7, W); px(p, 16, 7, W);
  px(p, 15, 9, W); px(p, 16, 9, W);

  // Orange engine exhausts
  rect(p, 12, 21, 3, 2, Or);
  rect(p, 17, 21, 3, 2, Or);

  save(p, 'player.png');
}

// ── BEE ENEMY (24x24) ────────────────────────────────────────────────────────
function genBee() {
  const p  = mkPng(24, 24);
  const Y  = [255, 204, 0,   255]; // yellow body
  const Ly = [255, 230, 100, 255]; // light yellow highlight
  const Or = [255, 136, 0,   255]; // orange wings
  const W  = [255, 255, 255, 255]; // white antennae
  const Dk = [80,  40,  0,   255]; // dark eyes

  // Wings: orange ellipses left and right
  ellipse(p, 6,  13, 5, 4, Or);
  ellipse(p, 18, 13, 5, 4, Or);
  // Wing inner highlights
  ellipse(p, 6,  13, 2, 2, Ly);
  ellipse(p, 18, 13, 2, 2, Ly);

  // Body: yellow vertical ellipse
  ellipse(p, 12, 14, 3, 7, Y);
  // Body highlight
  ellipse(p, 12, 14, 1, 4, Ly);

  // Head
  ellipse(p, 12, 6, 3, 3, Y);

  // Eyes
  px(p, 11, 5, Dk); px(p, 13, 5, Dk);

  // Antennae
  px(p, 10, 2, W); px(p, 11, 3, W);
  px(p, 14, 2, W); px(p, 13, 3, W);

  save(p, 'enemy_bee.png');
}

// ── BUTTERFLY BOSS (40x40) ───────────────────────────────────────────────────
function genButterfly() {
  const p  = mkPng(40, 40);
  const C  = [0,   200, 255, 255]; // cyan upper wings
  const Lc = [120, 220, 255, 255]; // light cyan highlight
  const G  = [0,   210, 100, 255]; // green lower wings
  const Lg = [120, 255, 180, 255]; // light green highlight
  const Pu = [180, 50,  255, 255]; // purple body
  const Lp = [210, 130, 255, 255]; // light purple highlight
  const R  = [255, 60,  60,  255]; // red eyes
  const W  = [255, 255, 255, 255]; // white antennae

  // Upper wings (cyan)
  ellipse(p, 11, 15, 10, 8, C);
  ellipse(p, 29, 15, 10, 8, C);
  ellipse(p, 11, 15,  5, 4, Lc);
  ellipse(p, 29, 15,  5, 4, Lc);

  // Lower wings (green)
  ellipse(p, 12, 28, 8, 6, G);
  ellipse(p, 28, 28, 8, 6, G);
  ellipse(p, 12, 28, 3, 3, Lg);
  ellipse(p, 28, 28, 3, 3, Lg);

  // Body
  ellipse(p, 20, 21, 4, 12, Pu);
  ellipse(p, 20, 21, 2,  7, Lp);

  // Head
  ellipse(p, 20, 8, 4, 4, Pu);

  // Eyes
  px(p, 18, 7, R); px(p, 22, 7, R);

  // Antennae
  px(p, 17, 4, W); px(p, 18, 5, W);
  px(p, 23, 4, W); px(p, 22, 5, W);

  save(p, 'enemy_butterfly.png');
}

// ── PLAYER BULLET (4x12) ─────────────────────────────────────────────────────
function genBulletPlayer() {
  const p = mkPng(4, 12);
  rect(p, 0, 0, 4, 12, [0,   255, 255, 255]);
  rect(p, 1, 1, 2, 10, [200, 255, 255, 255]); // white core
  save(p, 'bullet_player.png');
}

// ── ENEMY BULLET (4x10) ──────────────────────────────────────────────────────
function genBulletEnemy() {
  const p = mkPng(4, 10);
  rect(p, 0, 0, 4, 10, [255, 50,  50,  255]);
  rect(p, 1, 1, 2,  8, [255, 160, 50,  255]); // orange core
  save(p, 'bullet_enemy.png');
}

console.log('Generating sprites...');
genPlayer();
genBee();
genButterfly();
genBulletPlayer();
genBulletEnemy();
console.log('Done.');
