// Пересчитывает размеры изображений из файлов, которые лежат на диске,
// и сверяет их с закоммиченным src/lib/razmery.json.
//
// Закоммиченный файл — только кэш на случай сборки без «npm run images».
// Истина — реальные файлы: если владелец заменит снимок в Referens, а кэш
// не пересчитается, width/height в разметке начнут врать и вёрстка будет
// прыгать при загрузке.
//
// Запускается автоматически перед dev и build.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const KESH = 'src/lib/razmery.json';
const PAPKA = 'public/images';

const kesh = existsSync(KESH) ? JSON.parse(readFileSync(KESH, 'utf8')) : null;

if (!existsSync(`${PAPKA}/menu`)) {
  if (!kesh) {
    console.error('\n  Нет ни обработанных изображений, ни кэша размеров.');
    console.error('  Запустите «npm run images».\n');
    process.exit(1);
  }
  console.warn('  Обработанных изображений нет — размеры взяты из кэша. Запустите «npm run images».');
  process.exit(0);
}

const razmer = async (put) => {
  const { width, height } = await sharp(put).metadata();
  return { width, height };
};

const blyuda = {};
for (const file of readdirSync(`${PAPKA}/menu`)) {
  const kv = file.match(/^(.+)-kv-540\.webp$/);
  if (kv) (blyuda[kv[1]] ??= {}).kvadrat = await razmer(`${PAPKA}/menu/${file}`);
  const bol = file.match(/^(.+)-480\.webp$/);
  if (bol) (blyuda[bol[1]] ??= {}).bolshoe = await razmer(`${PAPKA}/menu/${file}`);
}

const foto = {};
for (const file of readdirSync(`${PAPKA}/photo`)) {
  const m = file.match(/^(.+)-1280\.webp$/);
  if (!m) continue;
  // Пропорции берём из готового файла, alt — из кэша: он задаётся в
  // process-images.mjs и по картинке не восстанавливается.
  foto[m[1]] = { ...(await razmer(`${PAPKA}/photo/${file}`)), alt: kesh?.foto?.[m[1]]?.alt ?? '' };
}

const logo = { milk: await razmer(`${PAPKA}/logo/logo-milk.png`) };

// Фон первого экрана. Пока владелец не положил Referens/hero-fon.png,
// файла нет и в разметку идёт запасная заливка.
const fonFile = `${PAPKA}/fon/hero-fon-1536.webp`;
const heroFon = existsSync(fonFile) ? await razmer(fonFile) : null;

const fakt = { blyuda, foto, logo, heroFon };

// Сверяем с кэшем и рассказываем, что разошлось.
if (kesh) {
  const rashozhdeniya = [];
  const sverit = (put, a, b) => {
    if (!a || !b) { rashozhdeniya.push(`${put}: ${!a ? 'нет на диске' : 'нет в кэше'}`); return; }
    if (a.width !== b.width || a.height !== b.height) {
      rashozhdeniya.push(`${put}: было ${b.width}×${b.height}, стало ${a.width}×${a.height}`);
    }
  };
  for (const id of new Set([...Object.keys(blyuda), ...Object.keys(kesh.blyuda ?? {})])) {
    sverit(`${id} (квадрат)`, blyuda[id]?.kvadrat, kesh.blyuda?.[id]?.kvadrat);
    sverit(`${id} (страница блюда)`, blyuda[id]?.bolshoe, kesh.blyuda?.[id]?.bolshoe);
  }
  for (const id of new Set([...Object.keys(foto), ...Object.keys(kesh.foto ?? {})])) {
    sverit(`фото ${id}`, foto[id], kesh.foto?.[id]);
  }
  if (heroFon || kesh.heroFon) sverit('фон первого экрана', heroFon, kesh.heroFon);
  if (rashozhdeniya.length) {
    console.warn(`\n  Размеры изображений разошлись с кэшем (${rashozhdeniya.length}) — беру фактические:`);
    for (const r of rashozhdeniya.slice(0, 15)) console.warn(`   • ${r}`);
    if (rashozhdeniya.length > 15) console.warn(`   • …и ещё ${rashozhdeniya.length - 15}`);
    console.warn(`  Закоммитьте обновлённый ${KESH}, чтобы предупреждение исчезло.\n`);
  }
  const altBezPodpisi = Object.entries(foto).filter(([, v]) => !v.alt).map(([k]) => k);
  if (altBezPodpisi.length) {
    console.warn(`  Нет подписи alt для кадров: ${altBezPodpisi.join(', ')} — добавьте в scripts/process-images.mjs.`);
  }
}

writeFileSync(KESH, JSON.stringify(fakt, null, 2) + '\n');
console.log(`  Размеры пересчитаны из файлов: ${Object.keys(blyuda).length} блюд, ${Object.keys(foto).length} кадров`
  + `${heroFon ? ', фон первого экрана' : ', фона первого экрана нет'}.`);
