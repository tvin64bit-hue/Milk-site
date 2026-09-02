// Фон первого экрана: акварельная текстура с вшитыми дудлами.
//
// Владелец генерирует картинку отдельно и кладёт в Referens/hero-fon.png.
// Здесь она приводится к палитре тем же механизмом, что и фотографии блюд:
// баланс белого множителями по каналам, нормированными по яркости.
// Экспозиция не трогается — преобладающий тон и так почти совпадает
// с --milk, а гамма-кривая размыла бы акварельные переходы.
import sharp from 'sharp';
import { primenitPravku } from './pravka-fona.mjs';

// --beige и --milk из tokens.css. Средние тона тянем к --beige, а
// преобладающий тон должен остаться там, где он и был, — у --milk.
export const BEZH = [227, 207, 172];
export const MOLOKO = [248, 238, 228];

// Силы правки, как у фотографий: берётся та, после которой цветность
// ближе всего к цели. Полная сила годится не всегда — баланс белого
// перераспределяет каналы нелинейно и легко даёт перелёт.
const SILY = [1, 0.85, 0.7, 0.5, 0.3, 0.15];

// Насколько разрешено потерять насыщенность — доля, а не пункты.
// У фотографий порог абсолютный, но там он охраняет небольшую область
// блюда; здесь меряется вся картинка, и возврат в гамму сам по себе
// немного снимает насыщенность. Выцветшее пятно перестаёт быть
// акварелью и превращается в грязное поле, поэтому предел десятая часть.
const PADENIE_NASYSHCHENNOSTI = 0.10;

// Средними тонами считаем всё между тенями и светами: именно они уводят
// картинку в персик, а света у неё и так молочные.
const SREDNIE = [150, 235];

// Зона полной силы правки и ширина спада по краям. Ровно в этом всё дело:
// баланс белого, применённый ко всему кадру, сажает средние тона на
// --beige, но заодно уводит молочную подложку в зелень — на полной силе
// света уходили от --milk на 17 пунктов цветности. Поэтому правка
// взвешивается по яркости пикселя и гаснет раньше, чем начинаются света:
// верхняя граница здесь 215, а не 235, иначе спад залезает в подложку.
const VES_POLNYY = [150, 215];
const SPAD_VNIZ = 40;
const SPAD_VVERH = 20;

const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// Цветность — две разности каналов. Сравнивать цвета целиком нельзя:
// разница светлоты тогда читается как разница оттенка.
const cvetnost = ([r, g, b]) => [r - g, g - b];
const otklonenie = (a, b) => Math.hypot(...cvetnost(a).map((v, i) => v - cvetnost(b)[i]));

// Ширина экрана и отношение ширины к высоте первого экрана на телефоне.
// Верхняя половина полосы — там, где стоит заголовок.
const MOBILNYE = [[320, 320 / 560], [390, 390 / 620], [480, 480 / 640]];

/**
 * Вес правки для пикселя данной яркости: единица в средних тонах,
 * ноль в светах и глубоких тенях, плавный переход между ними.
 */
function ves(y) {
  if (y >= VES_POLNYY[0] && y <= VES_POLNYY[1]) return 1;
  if (y < VES_POLNYY[0]) return Math.max(0, (y - (VES_POLNYY[0] - SPAD_VNIZ)) / SPAD_VNIZ);
  return Math.max(0, ((VES_POLNYY[1] + SPAD_VVERH) - y) / SPAD_VVERH);
}

/**
 * Смешивает исходник с выправленным кадром по весу яркости и общей силе.
 * Пиксель, который правка не должна трогать, остаётся собой байт в байт.
 */
async function smeshat(ishodnik, pravlenyy, sila) {
  const a = await piksely(ishodnik);
  const b = await piksely(pravlenyy);
  const out = Buffer.alloc(a.w * a.h * 3);
  for (let i = 0; i < a.w * a.h; i++) {
    const pa = i * a.ch, pb = i * b.ch, po = i * 3;
    const k = sila * ves(luma([a.data[pa], a.data[pa + 1], a.data[pa + 2]]));
    for (let c = 0; c < 3; c++) {
      out[po + c] = Math.round(a.data[pa + c] + (b.data[pb + c] - a.data[pa + c]) * k);
    }
  }
  return sharp(out, { raw: { width: a.w, height: a.h, channels: 3 } }).png().toBuffer();
}

async function piksely(vhod) {
  const { data, info } = await sharp(vhod).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
}

/** Самый частый цвет: гистограмма по кубам 16×16×16, среднее внутри победителя. */
function preobladayushchiy({ data, w, h, ch }) {
  const korziny = new Map();
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    const klyuch = (data[p] >> 4) * 256 + (data[p + 1] >> 4) * 16 + (data[p + 2] >> 4);
    let k = korziny.get(klyuch);
    if (!k) korziny.set(klyuch, (k = [0, 0, 0, 0]));
    k[0] += data[p]; k[1] += data[p + 1]; k[2] += data[p + 2]; k[3]++;
  }
  const [luchshaya] = [...korziny.values()].sort((a, b) => b[3] - a[3]);
  return luchshaya.slice(0, 3).map((s) => Math.round(s / luchshaya[3]));
}

/** Средний цвет пикселей, попавших в диапазон средних тонов. */
function srednieTona({ data, w, h, ch }) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    const y = luma([data[p], data[p + 1], data[p + 2]]);
    if (y < SREDNIE[0] || y > SREDNIE[1]) continue;
    r += data[p]; g += data[p + 1]; b += data[p + 2]; n++;
  }
  return n ? [r, g, b].map((s) => Math.round(s / n)) : [0, 0, 0];
}

/** Средний цвет светов — молочной подложки, которую правка трогать не должна. */
function sveta({ data, w, h, ch }) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    if (luma([data[p], data[p + 1], data[p + 2]]) <= SREDNIE[1]) continue;
    r += data[p]; g += data[p + 1]; b += data[p + 2]; n++;
  }
  return n ? [r, g, b].map((s) => Math.round(s / n)) : [0, 0, 0];
}

/** Средняя насыщенность кадра: max − min по каналам. */
function nasyshchennost({ data, w, h, ch }) {
  let s = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    s += Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]);
  }
  return s / (w * h);
}

/**
 * Яркость прямоугольной доли кадра. Минимум берётся не абсолютный, а по
 * первому проценту: одиночная тёмная точка не говорит ничего о том,
 * ляжет ли на этот участок текст.
 */
export function yarkostZony({ data, w, h, ch }, dolyaX = [0, 1], dolyaY = [0, 1]) {
  const x0 = Math.round(w * dolyaX[0]), x1 = Math.round(w * dolyaX[1]);
  const y0 = Math.round(h * dolyaY[0]), y1 = Math.round(h * dolyaY[1]);
  const znacheniya = [];
  let summa = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * w + x) * ch;
      const v = luma([data[p], data[p + 1], data[p + 2]]);
      znacheniya.push(v); summa += v;
    }
  }
  znacheniya.sort((a, b) => a - b);
  return {
    srednyaya: Math.round(summa / znacheniya.length),
    minimum: Math.round(znacheniya[0]),
    procent: Math.round(znacheniya[Math.floor(znacheniya.length * 0.01)]),
  };
}

/** Относительная яркость по WCAG — для контраста текста на фоне. */
function otnositelnaya([r, g, b]) {
  const k = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

export function kontrast(cvet1, cvet2) {
  const [a, b] = [otnositelnaya(cvet1), otnositelnaya(cvet2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const hex = ([r, g, b]) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0').toUpperCase()).join('');

/**
 * Приводит фон к палитре и возвращает выправленный кадр вместе с замерами.
 * Замеры печатаются, потому что проверить акварель автоматикой нельзя —
 * решение о том, живое ли пятно, остаётся за глазами.
 */
export async function pravitHeroFon(vhod) {
  const do_ = await piksely(vhod);
  const fon = srednieTona(do_);
  const cvetDo = preobladayushchiy(do_);
  const nasyshchennostDo = nasyshchennost(do_);

  // Цену правки считаем по двум точкам сразу: средние тона должны прийти
  // к --beige, а света — остаться у --milk, где они и стоят. По одной
  // точке сила подбирается так, что вторая уходит в чужой цвет.
  // Света берутся средним, а не самым частым цветом: гистограмма по кубам
  // скачет на соседний куб от малейшей правки и цену делает шумной.
  const cena = (sred, sv) => otklonenie(sred, BEZH) + otklonenie(sv, MOLOKO);

  // Полностью выправленный кадр считается один раз, силы получаются
  // смешиванием: сам баланс белого от силы не зависит.
  const polnaya = await primenitPravku(vhod, fon, BEZH, luma(BEZH), 1);

  let luchshee = { sila: 0, kadr: null, cena: cena(fon, sveta(do_)) };
  for (const sila of SILY) {
    const kadr = await smeshat(vhod, polnaya, sila);
    const posle = await piksely(kadr);
    // Выцветшее пятно хуже персикового: такую силу не берём вовсе.
    if (nasyshchennost(posle) < nasyshchennostDo * (1 - PADENIE_NASYSHCHENNOSTI)) continue;
    const c = cena(srednieTona(posle), sveta(posle));
    if (c < luchshee.cena) luchshee = { sila, kadr, cena: c, posle };
  }

  // Ни одна сила не улучшила картинку — оставляем как есть.
  const kadr = luchshee.kadr ?? await sharp(vhod).png().toBuffer();
  const posle = luchshee.posle ?? do_;
  const zamery = {
    razmer: [do_.w, do_.h],
    sila: luchshee.sila,
    nasyshchennost: { do: nasyshchennostDo, posle: nasyshchennost(posle) },
    preobladayushchiy: { do: cvetDo, posle: preobladayushchiy(posle) },
    srednieTona: { do: fon, posle: srednieTona(posle) },
    sveta: { do: sveta(do_), posle: sveta(posle) },
    levayaTret: yarkostZony(posle, [0, 0.34]),
    // Что попадёт в кадр на телефоне при object-position: left.
    // Картинка горизонтальная, экран вертикальный — видна узкая полоса слева.
    mobilnye: MOBILNYE.map(([ekran, otnoshenie]) => {
      const dolya = Math.min(1, (otnoshenie * posle.h) / posle.w);
      return { ekran, dolya, zona: yarkostZony(posle, [0, dolya], [0, 0.5]) };
    }),
  };
  return { kadr, zamery };
}

export function pechatZamerov(z) {
  console.log(`  Фон первого экрана: ${z.razmer[0]}×${z.razmer[1]}, сила правки ${z.sila || '0 — правка не улучшала'}`);
  console.log(`    преобладающий  ${hex(z.preobladayushchiy.do)} → ${hex(z.preobladayushchiy.posle)}  (--milk #F8EEE4)`);
  console.log(`    средние тона   ${hex(z.srednieTona.do)} → ${hex(z.srednieTona.posle)}  (--beige #E3CFAC)`);
  console.log(`    света          ${hex(z.sveta.do)} → ${hex(z.sveta.posle)}  (--milk #F8EEE4, правка их не трогает)`);
  const dolya = (z.nasyshchennost.posle / z.nasyshchennost.do - 1) * 100;
  console.log(`    насыщенность   ${z.nasyshchennost.do.toFixed(1)} → ${z.nasyshchennost.posle.toFixed(1)} `
    + `(${dolya >= 0 ? '+' : ''}${dolya.toFixed(1)} %, предел −10 %)`);
  const t = z.levayaTret;
  const k = kontrast([61, 43, 28], [t.procent, t.procent, t.procent]);
  console.log(`    левая треть    яркость ${t.srednyaya}, минимум ${t.minimum}, первый процент ${t.procent}`);
  console.log(`    контраст --ink на самом тёмном проценте левой трети: ${k.toFixed(2)}:1 ${k >= 4.5 ? '✓' : '✗'}`);
  for (const m of z.mobilnye) {
    const kk = kontrast([61, 43, 28], [m.zona.procent, m.zona.procent, m.zona.procent]);
    console.log(`    ${m.ekran} px: в кадре левые ${Math.round(m.dolya * 100)} %, `
      + `яркость ${m.zona.srednyaya}, первый процент ${m.zona.procent}, контраст ${kk.toFixed(2)}:1 ${kk >= 4.5 ? '✓' : '✗'}`);
  }
}
