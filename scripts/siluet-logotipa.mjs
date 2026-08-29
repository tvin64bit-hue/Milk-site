// Обводит силуэт акварельной подложки логотипа и превращает его в путь
// той же системы координат, что и маски-блобы (доли от 0 до 1).
// Нужен как эталон: формы блоба должны узнаваться как родня логотипу.
//
// Запуск: node scripts/siluet-logotipa.mjs
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { konturBloba } from './blob.mjs';

const LUCHEY = 96;      // сколько направлений промеряем
const SGLAZHIVANIE = 5; // ширина окна, которым заглаживается рваный акварельный край

const { data, info } = await sharp('Referens/logo-1.png')
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;

// Центр берём как середину непрозрачной области, а не геометрический:
// подложка на исходнике смещена.
let sx = 0, sy = 0, n = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * ch + 3] > 128) { sx += x; sy += y; n++; }
  }
}
const cx = sx / n, cy = sy / n;

// Для каждого направления ищем самую дальнюю непрозрачную точку.
const radiusy = [];
for (let i = 0; i < LUCHEY; i++) {
  const ugol = (i / LUCHEY) * Math.PI * 2;
  const dx = Math.cos(ugol), dy = Math.sin(ugol);
  let dalshe = 0;
  for (let r = 2; r < Math.max(w, h); r += 1.5) {
    const x = Math.round(cx + dx * r), y = Math.round(cy + dy * r);
    if (x < 0 || y < 0 || x >= w || y >= h) break;
    if (data[(y * w + x) * ch + 3] > 128) dalshe = r;
  }
  radiusy.push(dalshe);
}

// Заглаживаем акварельные рваные края скользящим средним по кругу.
const sglazheno = radiusy.map((_, i) => {
  let summa = 0;
  for (let k = -SGLAZHIVANIE; k <= SGLAZHIVANIE; k++) {
    summa += radiusy[(i + k + LUCHEY) % LUCHEY];
  }
  return summa / (SGLAZHIVANIE * 2 + 1);
});

// Приводим к долям квадрата: самый длинный радиус становится 0.5.
const maks = Math.max(...sglazheno);
const dolya = sglazheno.map((r) => (r / maks) * 0.5);

const put = konturBloba(dolya.map((r) => [r, 1]), { povorot: 0, szhatieY: 1 });
writeFileSync('src/lib/siluet-logotipa.json', JSON.stringify({ put }, null, 2) + '\n');

const shirina = Math.max(...dolya.map((r, i) => Math.abs(Math.cos((i / LUCHEY) * Math.PI * 2) * r))) * 2;
const vysota = Math.max(...dolya.map((r, i) => Math.abs(Math.sin((i / LUCHEY) * Math.PI * 2) * r))) * 2;
console.log(`Силуэт обведён: ${LUCHEY} лучей, пропорция ${(shirina / vysota).toFixed(2)} (ширина к высоте).`);
console.log(`Долей по контуру видно по чередованию радиусов: min ${Math.min(...dolya).toFixed(3)}, max ${Math.max(...dolya).toFixed(3)}`);
