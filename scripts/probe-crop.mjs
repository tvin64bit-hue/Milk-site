// Служебный скрипт: собирает контрольный лист обрезки брендированных карточек.
// Запускать вручную при подозрении, что обрезка испортилась: node scripts/probe-crop.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';

const { menu, rezultat } = sopostavit();
const top = menu.items.filter((i) => i.crop === 'top' && i.image);
const K = 200, kol = 7;
const plitki = [];
for (const [n, item] of top.entries()) {
  const put = `${ISHODNIKI_BLYUDA}/${rezultat.get(item.id)}`;
  const { kvadrat, otchet } = await polosaBezTeksta(put, item.id);
  console.log(`${item.id.padEnd(34)} ${otchet}`);
  plitki.push({ input: await sharp(kvadrat).resize(K, K).toBuffer(), left: (n % kol) * K, top: Math.floor(n / kol) * K });
}
mkdirSync('/tmp/claude-0/-home-user-Milk-site/e9b5955b-76a0-50f8-bf06-d8402dfc9488/scratchpad/crop', { recursive: true });
await sharp({ create: { width: kol * K, height: Math.ceil(top.length / kol) * K, channels: 3, background: '#ffffff' } })
  .composite(plitki).png().toFile('/tmp/claude-0/-home-user-Milk-site/e9b5955b-76a0-50f8-bf06-d8402dfc9488/scratchpad/crop/avto.png');
