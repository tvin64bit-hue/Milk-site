// Приведение снимков с выпадающим фоном к молочной гамме сайта.
//
// Стоковые кадры сняты на чисто-белом, чёрном или холодном сером фоне.
// Под блоб-маской белый растворяет форму и оставляет дырку в сетке,
// тёмный даёт пятно. Тип фона определяется автоматически, поэтому новые
// снимки обрабатываются без правки кода.
//
// Порядок шагов важен, обратный не работает: сначала кадр обрезается
// плотнее к блюду и только потом правится остаток фона. Если тонировать
// сразу, работы больше, а на границе блюда появляется ореол.
import sharp from 'sharp';
import { tipFona, CHUZHAYA_SYEMKA, ETALON_FONA } from './opredelit-fon.mjs';

const MOLOCHNYY = [248, 238, 228];

// Выше этого уровня яркость при нормализации поджимается, а не растёт линейно.
const POROG_SVETOV = 185;

/**
 * Обрезает кадр ближе к блюду. «Не фон» считается по расстоянию от цвета
 * рамки, поэтому работает и на белом, и на чёрном, и на сером.
 */
export async function plotnyyKadr(vhod, cvetFona, pole) {
  const { data, info } = await sharp(vhod).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const [fr, fg, fb] = cvetFona;

  const poStrokam = new Float32Array(h);
  const poStolbcam = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * ch;
      const otlichie = Math.abs(data[p] - fr) + Math.abs(data[p + 1] - fg) + Math.abs(data[p + 2] - fb);
      if (otlichie > 60) { poStrokam[y]++; poStolbcam[x]++; }
    }
  }

  // Порог в 2 % отсекает одиночный шум, блики и текстуру фона.
  const granicy = (profil, predel) => {
    const porog = predel * 0.02;
    let a = 0; while (a < profil.length && profil[a] < porog) a++;
    let b = profil.length - 1; while (b > a && profil[b] < porog) b--;
    return [a, b];
  };
  const [verh, niz] = granicy(poStrokam, w);
  const [levo, pravo] = granicy(poStolbcam, h);
  if (niz <= verh || pravo <= levo) return sharp(vhod).png().toBuffer();

  const shirina = pravo - levo + 1;
  const vysota = niz - verh + 1;
  const bok = Math.max(shirina, vysota);
  const storona = Math.min(w, h, Math.round(bok * (1 + pole * 2)));
  const left = Math.max(0, Math.min(w - storona, Math.round(levo + shirina / 2 - storona / 2)));
  const top = Math.max(0, Math.min(h - storona, Math.round(verh + vysota / 2 - storona / 2)));

  return sharp(vhod).extract({ left, top, width: storona, height: storona }).png().toBuffer();
}

/** Заменяет чисто-белый фон молочным. */
export async function zamenitBelyy(vhod, cvet = MOLOCHNYY) {
  const { data, info } = await sharp(vhod).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
    const maks = Math.max(r, g, b);
    const nasyshchennost = maks - Math.min(r, g, b);
    // Широкий диапазон перехода: если брать только совсем белое,
    // светлая тень под блюдом останется белесым ореолом.
    const dolya = Math.min(1, Math.max(0, (maks - 214) / 34))
      * Math.min(1, Math.max(0, (26 - nasyshchennost) / 12));
    if (dolya > 0) {
      out[p] = Math.round(r + (cvet[0] - r) * dolya);
      out[p + 1] = Math.round(g + (cvet[1] - g) * dolya);
      out[p + 2] = Math.round(b + (cvet[2] - b) * dolya);
    }
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

/**
 * Согревает холодный кадр, не поднимая тёмную точку.
 * Подъём теней делает снимок мутно-серым — именно поэтому здесь только
 * сдвиг баланса по каналам.
 */
export async function sogret(vhod) {
  return sharp(vhod)
    .linear([1.0, 0.975, 0.93], [4, 2, 0])
    .modulate({ saturation: 1.04 })
    .png()
    .toBuffer();
}

/**
 * Приводит фон кадра к эталонному оттенку покадровым множителем по каналам.
 *
 * Это не подъём теней, который делал тёмный сланец мутным: там вытягивался
 * чужой фон, здесь свой нейтрально-серый приводится к своему же целевому
 * оттенку. Операция предсказуемая — множитель, а не сдвиг.
 */
export async function normalizovatFon(vhod, fon, cel) {
  const k = cel.map((c, i) => Math.min(1.45, Math.max(0.75, c / Math.max(1, fon[i]))));

  // Чистый множитель выбивает света: на филадельфии красный канал уходил
  // в 255 у 59 % пикселей рыбы, и лосось терял фактуру. Поэтому выше порога
  // яркость поджимается плавно и 255 достигается только в пределе.
  const tablica = k.map((kc) => {
    const lut = Buffer.alloc(256);
    for (let x = 0; x < 256; x++) {
      const y = x * kc;
      lut[x] = Math.round(Math.min(255, y <= POROG_SVETOV
        ? y
        : POROG_SVETOV + (255 - POROG_SVETOV) * (1 - Math.exp(-(y - POROG_SVETOV) / (255 - POROG_SVETOV)))));
    }
    return lut;
  });

  const { data, info } = await sharp(vhod).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += info.channels) {
    out[i] = tablica[0][data[i]];
    out[i + 1] = tablica[1][data[i + 1]];
    out[i + 2] = tablica[2][data[i + 2]];
    for (let c = 3; c < info.channels; c++) out[i + c] = data[i + c];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png().toBuffer();
}

/**
 * Целевой фон: цветность берётся из эталона, яркость — из эталонного кадра.
 *
 * Замер владельца #A29A8C сделан по углу исходника, а конвейер меряет рамку
 * готового кадра, где яркость выше. Если целиться в абсолютные 155, сама
 * shakshuka потемнеет и перестанет быть эталоном, поэтому цветность
 * оставляем её, а яркость подтягиваем к тому, как эталон выглядит на выходе.
 */
export function celevoyFon(yarkostEtalonnogoKadra) {
  const yarkostEtalona = 0.299 * ETALON_FONA[0] + 0.587 * ETALON_FONA[1] + 0.114 * ETALON_FONA[2];
  const mnozhitel = yarkostEtalonnogoKadra / yarkostEtalona;
  return ETALON_FONA.map((c) => Math.round(c * mnozhitel));
}

/**
 * Правит кадр по типу фона. Возвращает кадр и что с ним сделали.
 *
 * Чужая съёмка: плотный кроп, чтобы пятна осталось меньше, и правка остатка.
 * Свой фон со сбитым балансом: нормализация к эталону, кроп не нужен.
 * Для тёмного фона тонировки нет — подъём теней только мутит снимок.
 */
export async function pravitFon(kvadrat, slug, cel) {
  const { tip, rgb, chuzhaya } = await tipFona(kvadrat, slug);

  if (chuzhaya) {
    const pole = tip === 'чисто-белый' ? 0.07 : 0.03;
    const obrezano = await plotnyyKadr(kvadrat, rgb, pole);
    if (tip === 'чисто-белый') {
      return { kadr: await zamenitBelyy(obrezano), tip, chto: 'плотный кроп, белый фон заменён молочным' };
    }
    return { kadr: await sogret(obrezano), tip, chto: 'плотный кроп, кадр согрет без подъёма теней' };
  }

  if (tip === 'свой фон, сбит баланс' && cel) {
    return { kadr: await normalizovatFon(kvadrat, rgb, cel), tip, chto: 'фон приведён к эталону' };
  }
  return { kadr: kvadrat, tip, chto: null };
}
