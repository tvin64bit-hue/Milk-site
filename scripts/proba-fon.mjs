// Готовит кадры «как есть» и отчёт о фонах для страницы /styleguide.
// На сайт идут уже поправленные версии из process-images.mjs.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import sharp from 'sharp';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { tipFona } from './opredelit-fon.mjs';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';

const PAPKA = 'public/images/proba';
rmSync(PAPKA, { recursive: true, force: true });
mkdirSync(PAPKA, { recursive: true });
const { menu, rezultat } = sopostavit();

// Кадры, которые страница /styleguide показывает в сравнении, даже если
// правка их не коснулась: сетка завтраков должна быть видна целиком.
const NUZHNY_STRANICE = new Set(['shakshuka', 'vafli-s-bekonom', 'syrniki-s-kokosovoy-sguschenkoy', 'bliny-s-lososem', 'filadelfiya-lyuks']);

const chuzhaya = [];
const normalizovano = [];

for (const item of menu.items) {
  const file = rezultat.get(item.id);
  if (!file) continue;
  const { kvadrat } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${file}`, item.id, item.crop);
  const f = await tipFona(kvadrat, item.id);
  const zapis = {
    id: item.id, kategoriya: item.category, tip: f.tip,
    yarkost: f.yarkost, teplo: f.teplo,
    hex: `#${f.rgb.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`,
  };
  if (f.chuzhaya) chuzhaya.push(zapis);
  else if (f.tip === 'свой фон, сбит баланс') normalizovano.push({ ...zapis, otstup: f.otstup });
  else if (!NUZHNY_STRANICE.has(item.id)) continue;
  await sharp(kvadrat).resize(540, 540).webp({ quality: 82 }).toFile(`${PAPKA}/${item.id}-kak-est.webp`);
}

normalizovano.sort((a, b) => b.otstup - a.otstup);
writeFileSync('src/lib/fony-otchet.json', JSON.stringify({ chuzhaya, normalizovano }, null, 2) + '\n');
console.log(`  Отчёт о фонах: чужая съёмка ${chuzhaya.length}, нормализовано ${normalizovano.length}.`);
