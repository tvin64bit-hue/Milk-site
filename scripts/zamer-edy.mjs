// Замер цвета еды на кадре.
//
// Область фиксируется по исходному кадру и дальше не пересчитывается: если
// отбирать пиксели порогом заново после правки, набор точек меняется и
// сравнение теряет смысл — так была пропущена пожелтевшая рыба.
import sharp from 'sharp';

const POROG_NASYSHCHENNOSTI = 0.40; // еда насыщеннее фона
const MIN_DOLYA = 0.02;             // область меньше 2 % кадра считаем шумом

function vHsv(r, g, b) {
  const maks = Math.max(r, g, b), min = Math.min(r, g, b), d = maks - min;
  let ton = 0;
  if (d) {
    if (maks === r) ton = 60 * (((g - b) / d) % 6);
    else if (maks === g) ton = 60 * ((b - r) / d + 2);
    else ton = 60 * ((r - g) / d + 4);
  }
  return { ton: (ton + 360) % 360, nasyshchennost: maks ? d / maks : 0, yarkost: maks / 255 };
}

/** Крупнейшая связная область насыщенного цвета — как правило, само блюдо. */
export async function oblastEdy(kadr) {
  const { data, info } = await sharp(kadr).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const nasyshchennaya = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    const { nasyshchennost, yarkost } = vHsv(data[p], data[p + 1], data[p + 2]);
    // Совсем тёмные пиксели по насыщенности недостоверны.
    if (nasyshchennost >= POROG_NASYSHCHENNOSTI && yarkost > 0.12) nasyshchennaya[i] = 1;
  }

  // Разметка связных областей обходом в ширину, без рекурсии.
  const metka = new Int32Array(w * h).fill(-1);
  const ochered = new Int32Array(w * h);
  let luchshaya = null;
  let nomer = 0;

  for (let start = 0; start < w * h; start++) {
    if (!nasyshchennaya[start] || metka[start] !== -1) continue;
    let hvost = 0, golova = 0, razmer = 0;
    ochered[hvost++] = start;
    metka[start] = nomer;
    const tochki = [];
    while (golova < hvost) {
      const i = ochered[golova++];
      tochki.push(i);
      razmer++;
      const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (nasyshchennaya[j] && metka[j] === -1) { metka[j] = nomer; ochered[hvost++] = j; }
      }
    }
    if (!luchshaya || razmer > luchshaya.razmer) luchshaya = { razmer, tochki };
    nomer++;
  }

  if (!luchshaya || luchshaya.razmer < w * h * MIN_DOLYA) return null;
  return { tochki: Int32Array.from(luchshaya.tochki), dolya: luchshaya.razmer / (w * h), width: w, height: h };
}

/** Средние тон, насыщенность и яркость по заранее найденной области. */
export async function metrikiPoOblasti(kadr, oblast) {
  const { data, info } = await sharp(kadr).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  // Тон усредняем через вектор: среднее арифметическое по кругу неверно.
  let sx = 0, sy = 0, sn = 0, sv = 0;
  for (const i of oblast.tochki) {
    const p = i * ch;
    const { ton, nasyshchennost, yarkost } = vHsv(data[p], data[p + 1], data[p + 2]);
    const ugol = (ton * Math.PI) / 180;
    sx += Math.cos(ugol); sy += Math.sin(ugol);
    sn += nasyshchennost; sv += yarkost;
  }
  const n = oblast.tochki.length;
  return {
    ton: ((Math.atan2(sy / n, sx / n) * 180) / Math.PI + 360) % 360,
    nasyshchennost: (sn / n) * 100,
    yarkost: (sv / n) * 100,
  };
}

/** Пороги, за которыми правка признаётся испортившей еду. */
export const PREDELY = { ton: 3, nasyshchennost: 5, yarkost: 8 };

export function ocenit(do_, posle) {
  const raznicaTona = Math.abs(((posle.ton - do_.ton + 540) % 360) - 180);
  return {
    ton: raznicaTona,
    nasyshchennost: do_.nasyshchennost - posle.nasyshchennost,
    yarkost: Math.abs(posle.yarkost - do_.yarkost),
    proshel: raznicaTona <= PREDELY.ton
      && do_.nasyshchennost - posle.nasyshchennost <= PREDELY.nasyshchennost
      && Math.abs(posle.yarkost - do_.yarkost) <= PREDELY.yarkost,
  };
}
