// Скачивает шрифты Rubik и Onest к себе, чтобы страница не зависела от
// Google Fonts: оттуда файлы иногда идут медленно, а при недоступности
// текст показывается системным шрифтом и вид страницы меняется.
//
// Запуск: node scripts/shrifty.mjs. Файлы кладутся в public/fonts вместе
// с готовым shrifty.css — его подключают оба слоя, Astro и PHP. Пути
// внутри относительные, поэтому подкаталог сайта на них не влияет.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

// Что берём. Начертания — те же, что были в ссылке на Google Fonts.
const SEMEYSTVA = [
  { imya: 'Rubik', vesa: [600, 700], licenziya: 'rubik' },
  { imya: 'Onest', vesa: [400, 500, 600], licenziya: 'onest' },
];

// Подмножества. latin-ext нужен не для европейских языков, а ради знака
// рубля U+20BD: он лежит именно там, и без него все цены на сайте
// рисовались бы системным шрифтом.
const PODMNOZHESTVA = ['latin', 'latin-ext', 'cyrillic'];

// Google отдаёт woff2 только современным браузерам, а по умолчанию —
// устаревший ttf. Поэтому представляемся браузером.
const BRAUZER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const zapros = SEMEYSTVA
  .map((s) => `family=${s.imya}:wght@${s.vesa.join(';')}`)
  .join('&');
const otvet = await fetch(
  `https://fonts.googleapis.com/css2?${zapros}&display=swap`,
  { headers: { 'User-Agent': BRAUZER } },
);
if (!otvet.ok) throw new Error(`Google Fonts ответил ${otvet.status}`);
const css = await otvet.text();

// Разбор ответа: перед каждым @font-face стоит комментарий с названием
// подмножества — по нему и отбираем нужные.
const bloki = [...css.matchAll(
  /\/\* ([a-z-]+) \*\/\s*@font-face \{([\s\S]*?)\}/g,
)].map(([, podmnozhestvo, telo]) => ({
  podmnozhestvo,
  semeystvo: telo.match(/font-family: '([^']+)'/)[1],
  ves: Number(telo.match(/font-weight: (\d+)/)[1]),
  adres: telo.match(/url\(([^)]+)\)/)[1],
  diapazon: telo.match(/unicode-range: ([^;]+);/)[1].trim(),
})).filter((b) => PODMNOZHESTVA.includes(b.podmnozhestvo));

rmSync('public/fonts', { recursive: true, force: true });
mkdirSync('public/fonts', { recursive: true });

// Оба шрифта вариативные: на все начертания одного подмножества Google
// отдаёт один и тот же файл, меняя лишь запись font-weight. Поэтому файл
// скачивается один раз на подмножество, а вес объявляется диапазоном —
// иначе на диск легло бы пятнадцать файлов вместо шести, из них девять
// побайтно одинаковых.
const gruppy = new Map();
for (const b of bloki) {
  const klyuch = `${b.semeystvo}|${b.podmnozhestvo}`;
  const est = gruppy.get(klyuch);
  if (est) { est.vesa.push(b.ves); } else { gruppy.set(klyuch, { ...b, vesa: [b.ves] }); }
}

let stili = '/* Шрифты сайта. Файл собирает scripts/shrifty.mjs — руками не правят.\n'
  + '   Лежат рядом со страницей, а не на Google Fonts: так вид не зависит\n'
  + '   от доступности чужого сервера. */\n';

for (const g of gruppy.values()) {
  const imya = `${g.semeystvo.toLowerCase()}-${g.podmnozhestvo}.woff2`;
  const fajl = await fetch(g.adres, { headers: { 'User-Agent': BRAUZER } });
  if (!fajl.ok) throw new Error(`${imya}: ответ ${fajl.status}`);
  writeFileSync(`public/fonts/${imya}`, Buffer.from(await fajl.arrayBuffer()));
  const ot = Math.min(...g.vesa);
  const do_ = Math.max(...g.vesa);
  stili += `\n@font-face {\n  font-family: '${g.semeystvo}';\n  font-style: normal;\n`
    + `  font-weight: ${ot === do_ ? ot : `${ot} ${do_}`};\n  font-display: swap;\n`
    + `  src: url(${imya}) format('woff2');\n  unicode-range: ${g.diapazon};\n}\n`;
}

writeFileSync('public/fonts/shrifty.css', stili);

// Лицензия. Оба шрифта распространяются по SIL Open Font License, а она
// требует, чтобы копия текста шла вместе с файлами шрифта — и там, куда
// они выгружены, тоже.
for (const s of SEMEYSTVA) {
  const otvet = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${s.licenziya}/OFL.txt`,
  );
  if (!otvet.ok) throw new Error(`лицензия ${s.imya}: ответ ${otvet.status}`);
  writeFileSync(`public/fonts/LICENSE-${s.imya}.txt`, await otvet.text());
}

console.log(`Шрифтов: ${gruppy.size} файлов, подмножества ${PODMNOZHESTVA.join(', ')}`);
console.log(`  лицензии: ${SEMEYSTVA.map((s) => `LICENSE-${s.imya}.txt`).join(', ')}`);
