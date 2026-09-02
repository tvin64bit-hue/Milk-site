// Проверка читаемости текста на фоне первого экрана.
//
// Замер «яркость левой трети» из отчёта конвейера говорит о картинке,
// а не о вёрстке: на узком окне object-fit: cover показывает не ту треть,
// которую мерили. Поэтому здесь фон снимается таким, каким его видит
// браузер, и меряется ровно тот прямоугольник, где стоит текст.
//
// Требует запущенного «npm run preview».
// Запуск: node scripts/proverka-fona.mjs [адрес]
import { chromium } from 'playwright';
import sharp from 'sharp';

const BAZA = process.argv[2] ?? 'http://localhost:4321/Milk-site';
const SHIRINY = [[320, 568], [390, 844], [480, 800], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];

// --ink из tokens.css: цвет заголовка и абзаца первого экрана.
const INK = [61, 43, 28];
const PORAG = 4.5;

const otnositelnaya = ([r, g, b]) => {
  const k = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
};
const kontrast = (a, b) => {
  const [v, n] = [otnositelnaya(a), otnositelnaya(b)].sort((x, y) => y - x);
  return (v + 0.05) / (n + 0.05);
};

const brauzer = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let plohih = 0;

for (const [w, h] of SHIRINY) {
  const stranica = await brauzer.newPage({ viewport: { width: w, height: h } });
  await stranica.goto(`${BAZA}/`, { waitUntil: 'networkidle' });

  const est = await stranica.evaluate(() => !!document.querySelector('.fon-ekrana'));
  if (!est) { console.log(`${String(w).padStart(4)} — первого экрана с фоном нет`); await stranica.close(); continue; }

  const ramka = await stranica.evaluate(() => {
    const r = document.querySelector('.ekran__tekst').getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
  });
  // Текст прячем: меряется фон под ним, а не сам текст.
  await stranica.addStyleTag({ content: '.ekran__vnutri { visibility: hidden !important; }' });
  const snimok = await stranica.screenshot({ clip: ramka });
  await stranica.close();

  const { data, info } = await sharp(snimok).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const yarkosti = [];
  for (let i = 0; i < info.width * info.height; i++) {
    const p = i * info.channels;
    yarkosti.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }
  yarkosti.sort((a, b) => a - b);
  // Первый процент вместо абсолютного минимума: одиночная тёмная точка
  // под буквой не мешает читать, сплошное тёмное поле мешает.
  const temnaya = Math.round(yarkosti[Math.floor(yarkosti.length * 0.01)]);
  const srednyaya = Math.round(yarkosti.reduce((s, v) => s + v, 0) / yarkosti.length);
  const k = kontrast(INK, [temnaya, temnaya, temnaya]);
  const horosho = k >= PORAG;
  if (!horosho) plohih++;
  console.log(`${String(w).padStart(4)}×${h}  фон под текстом: средняя ${srednyaya}, `
    + `тёмный процент ${temnaya}, контраст --ink ${k.toFixed(2)}:1 ${horosho ? '✓' : '✗'}`);
}

await brauzer.close();
if (plohih) {
  console.error(`\nТекст первого экрана попадает на тёмную часть фона на ${plohih} ширинах.`);
  process.exit(1);
}
console.log('\nТекст первого экрана читается на всех ширинах.');
