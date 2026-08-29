// Готовит кадры «как есть» для страницы /styleguide и список выпадающих
// снимков с типом фона. На сайт идут уже поправленные версии.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { tipFona, VYPADAET } from './opredelit-fon.mjs';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';

const PAPKA = 'public/images/proba';
mkdirSync(PAPKA, { recursive: true });
const { menu, rezultat } = sopostavit();

const vypadayushchie = [];
for (const item of menu.items) {
  const file = rezultat.get(item.id);
  if (!file) continue;
  const { kvadrat } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${file}`, item.id, item.crop);
  const { tip } = await tipFona(kvadrat);
  if (!VYPADAET.has(tip)) continue;
  await sharp(kvadrat).resize(540, 540).webp({ quality: 82 }).toFile(`${PAPKA}/${item.id}-kak-est.webp`);
  vypadayushchie.push({ id: item.id, kategoriya: item.category, tip });
}

writeFileSync('src/lib/vypadayushchie-fony.json', JSON.stringify(vypadayushchie, null, 2) + '\n');
console.log(`  Кадры «как есть»: ${vypadayushchie.length} снимков с выпадающим фоном.`);
