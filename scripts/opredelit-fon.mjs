// Определяет тип фона у всех снимков блюд по краевой рамке итогового кадра.
// Нужен, чтобы находить стоковые снимки на белом и тёмном фоне: под блоб-маской
// белый оставляет дырку в сетке, тёмный — пятно.
//
// Запуск: node scripts/opredelit-fon.mjs
import sharp from 'sharp';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';

const DOLYA_RAMKI = 0.08;

export async function tipFona(kadr) {
  const { data, info } = await sharp(kadr).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const polosa = Math.max(2, Math.round(Math.min(w, h) * DOLYA_RAMKI));

  const yarkosti = [], nasyshchennosti = [], rgb = [[], [], []];
  const vzyat = (x, y) => {
    const p = (y * w + x) * ch;
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
    yarkosti.push(0.299 * r + 0.587 * g + 0.114 * b);
    nasyshchennosti.push(Math.max(r, g, b) - Math.min(r, g, b));
    rgb[0].push(r); rgb[1].push(g); rgb[2].push(b);
  };
  for (let y = 0; y < h; y++) {
    const kray = y < polosa || y >= h - polosa;
    for (let x = 0; x < w; x++) {
      if (kray || x < polosa || x >= w - polosa) vzyat(x, y);
    }
  }

  const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const L = med(yarkosti);
  const S = med(nasyshchennosti);
  const [r, g, b] = rgb.map(med);
  // Тёплый фон: красного заметно больше синего. Так отделяется бежевое
  // кресло, дерево и фирменная подложка от нейтрального стокового серого.
  const teplo = r - b;

  let tip;
  if (L > 232 && S < 16) tip = 'чисто-белый';
  else if (L < 95) tip = 'тёмный';
  else if (L < 150 && teplo < 16) tip = 'тёмно-серый';
  else if (S < 16 && teplo < 12) tip = 'светло-серый';
  else if (teplo >= 16) tip = 'тёплый';
  else tip = 'нейтральный светлый';

  return { tip, L: Math.round(L), S: Math.round(S), teplo: Math.round(teplo), rgb: [r, g, b] };
}

// Выпадающими считаем всё, что не тёплое и не нейтральное светлое.
export const VYPADAET = new Set(['чисто-белый', 'тёмный', 'тёмно-серый', 'светло-серый']);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { menu, rezultat } = sopostavit();
  const stroki = [];
  for (const item of menu.items) {
    const file = rezultat.get(item.id);
    if (!file) continue;
    const { kvadrat } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${file}`, item.id, item.crop);
    const r = await tipFona(kvadrat);
    stroki.push({ id: item.id, kategoriya: item.category, ...r });
  }

  const poTipu = {};
  for (const s of stroki) (poTipu[s.tip] ??= []).push(s);

  console.log('\nСводка по типам фона:');
  for (const [tip, spisok] of Object.entries(poTipu).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${tip.padEnd(20)} ${String(spisok.length).padStart(3)}${VYPADAET.has(tip) ? '  ← выпадает' : ''}`);
  }

  const plohie = stroki.filter((s) => VYPADAET.has(s.tip));
  console.log(`\nВыпадающие снимки (${plohie.length}):`);
  for (const s of plohie.sort((a, b) => a.kategoriya.localeCompare(b.kategoriya) || a.id.localeCompare(b.id))) {
    console.log(`  ${s.id.padEnd(38)} ${s.tip.padEnd(14)} ${s.kategoriya.padEnd(20)} L=${String(s.L).padStart(3)} S=${String(s.S).padStart(3)}`);
  }

  // Категория, выпавшая целиком, — отдельная беда: на неё ведёт плитка с главной.
  console.log('\nДоля выпадающих по категориям:');
  const poKat = {};
  for (const s of stroki) {
    (poKat[s.kategoriya] ??= { vsego: 0, ploho: 0 }).vsego++;
    if (VYPADAET.has(s.tip)) poKat[s.kategoriya].ploho++;
  }
  for (const [k, v] of Object.entries(poKat).sort((a, b) => b[1].ploho / b[1].vsego - a[1].ploho / a[1].vsego)) {
    if (!v.ploho) continue;
    const celikom = v.ploho === v.vsego ? '  ← категория выпадает целиком' : '';
    console.log(`  ${k.padEnd(20)} ${v.ploho} из ${v.vsego}${celikom}`);
  }
}
