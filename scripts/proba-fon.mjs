// Проба: как привести три снимка с выпадающим фоном к молочной гамме.
// Готовит варианты в public/images/proba для сравнения на /styleguide.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';

const PAPKA = 'public/images/proba';
mkdirSync(PAPKA, { recursive: true });
const { menu, rezultat } = sopostavit();
const poId = new Map(menu.items.map((b) => [b.id, b]));

// Белый фон заменяем на молочно-розовый: снимок снят на чистом белом,
// поэтому светлые ненасыщенные пиксели отделяются надёжно.
async function zamenitBelyy(vhod, cvet = [248, 238, 228]) {
  const { data, info } = await sharp(vhod).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
    const maks = Math.max(r, g, b);
    const nasyshchennost = maks - Math.min(r, g, b);
    // Плавный переход по яркости, чтобы края блюда не обрезались ступенькой.
    // Широкий диапазон перехода: если брать только совсем белое,
    // светлая тень под блюдом останется белесым ореолом.
    const poYarkosti = Math.min(1, Math.max(0, (maks - 214) / 34));
    const poNasyshchennosti = Math.min(1, Math.max(0, (26 - nasyshchennost) / 12));
    const dolya = poYarkosti * poNasyshchennosti;
    if (dolya > 0) {
      out[p] = Math.round(r + (cvet[0] - r) * dolya);
      out[p + 1] = Math.round(g + (cvet[1] - g) * dolya);
      out[p + 2] = Math.round(b + (cvet[2] - b) * dolya);
    }
  }
  return sharp(out, { raw: { width, height, channels } }).webp({ quality: 82 }).toBuffer();
}

// Чёрный сланец поднимаем по тёмной точке и уводим в тёплый тон,
// чтобы пятно перестало быть чёрным, но продукт остался узнаваемым.
async function sogretTemnyy(vhod) {
  return sharp(vhod)
    .linear([0.74, 0.75, 0.71], [62, 53, 40])
    .modulate({ saturation: 0.95 })
    .webp({ quality: 82 })
    .toBuffer();
}

const ZADANIYA = [
  ['kaliforniya-klassik', zamenitBelyy],
  ['filadelfiya-layt', sogretTemnyy],
  ['filadelfiya-ugor-layt', sogretTemnyy],
];

for (const [id, obrabotka] of ZADANIYA) {
  const blyudo = poId.get(id);
  const { kvadrat } = await polosaBezTeksta(`Referens/Menu/${rezultat.get(id)}`, id, blyudo.crop);
  await sharp(kvadrat).resize(540, 540).webp({ quality: 82 }).toFile(`${PAPKA}/${id}-kak-est.webp`);
  const ispravleno = await obrabotka(await sharp(kvadrat).resize(540, 540).toBuffer());
  await sharp(ispravleno).toFile(`${PAPKA}/${id}-ispravleno.webp`);
  console.log(`${id}: готовы «как есть» и «исправлено»`);
}
