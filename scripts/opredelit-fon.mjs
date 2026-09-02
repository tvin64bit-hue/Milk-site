// Определяет свойства фона у снимков блюд по краевой рамке готового кадра.
//
// Яркость и цветность разбираются отдельно. Если их смешать, кадры со своего
// бежевого кресла, снятые темнее или с другим балансом белого, уезжают в брак
// вместе с настоящей стоковой съёмкой.
import sharp from 'sharp';

const DOLYA_RAMKI = 0.08;

// Эталон — угловой фон снимка shakshuka: то самое кресло при верном балансе.
export const ETALON_FONA = [162, 154, 140];

export async function tipFona(kadr, slug) {
  const { data, info } = await sharp(kadr).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const polosa = Math.max(2, Math.round(Math.min(w, h) * DOLYA_RAMKI));

  const rgb = [[], [], []];
  for (let y = 0; y < h; y++) {
    const kray = y < polosa || y >= h - polosa;
    for (let x = 0; x < w; x++) {
      if (!kray && x >= polosa && x < w - polosa) continue;
      const p = (y * w + x) * ch;
      rgb[0].push(data[p]); rgb[1].push(data[p + 1]); rgb[2].push(data[p + 2]);
    }
  }
  const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const [r, g, b] = rgb.map(med);

  // Однородность рамки: если по краю идёт ровный фон, разброс мал; если в
  // рамку попало само блюдо или край тарелки — велик. Без этой проверки
  // серая тарелка во весь кадр читается как холодный стоковый фон.
  const yarkosti = rgb[0].map((_, i) => 0.299 * rgb[0][i] + 0.587 * rgb[1][i] + 0.114 * rgb[2][i]);
  const sredn = med(yarkosti);
  const razbros = Math.round(med(yarkosti.map((v) => Math.abs(v - sredn))));

  // Два независимых признака.
  const yarkost = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const teplo = r - b;                              // цветность: тёплый минус холодный
  const nasyshchennost = Math.max(r, g, b) - Math.min(r, g, b);

  return { ...klassificirovat(yarkost, teplo, nasyshchennost, razbros, slug), yarkost, teplo, nasyshchennost, razbros, rgb: [r, g, b] };
}

// Границы подобраны по замерам: угловой фон кресла даёт теплоту от +6 до +22
// при яркости 130–165, стоковый фон — либо почти нейтральный, либо холодный.
const TEMNYY = 100;      // ниже этой яркости кадр снят не в зале
const BELYY = 232;       // выше — чисто-белый предметный фон
const HOLODNYY = 4;      // теплота ниже этой — нейтральный или синеватый сток
const SVOY_MIN = 100;    // границы яркости, в которых кресло вообще узнаётся
const SVOY_MAX = 205;
// Тёмные кадры, снятые в самом кафе: их не переснимают и не правят.
// Проверены глазами, автоматически от стоковых не отличаются.
const SVOI_TEMNYE = new Set([
  'molochnyy-kokteyl', // коктейли на фоне витрины и окна, честный кадр в зале
]);

function klassificirovat(yarkost, teplo, nasyshchennost, razbros, slug) {
  if (yarkost < TEMNYY) {
    return SVOI_TEMNYE.has(slug)
      ? { tip: 'свой тёмный', chuzhaya: false }
      : { tip: 'тёмный', chuzhaya: true };
  }
  if (yarkost > BELYY && nasyshchennost < 16) return { tip: 'чисто-белый', chuzhaya: true };
  // Холодным считаем только светлый предметный фон: в средних яркостях
  // нейтральный замер почти всегда означает попавшую в рамку тарелку.
  if (teplo < HOLODNYY && yarkost > SVOY_MAX) return { tip: 'холодный', chuzhaya: true };

  // Свой фон с уехавшим балансом: цветность на месте, яркость и оттенок гуляют.
  // Нейтральный замер в средних яркостях означает попавшую в рамку тарелку,
  // а не фон, — такой кадр не трогаем: правка увела бы его в желтизну.
  if (teplo >= HOLODNYY && yarkost >= SVOY_MIN && yarkost <= SVOY_MAX && nasyshchennost < 34) {
    const etalonYarkost = 0.299 * ETALON_FONA[0] + 0.587 * ETALON_FONA[1] + 0.114 * ETALON_FONA[2];
    const otstup = Math.round(Math.abs(yarkost - etalonYarkost) + Math.abs(teplo - (ETALON_FONA[0] - ETALON_FONA[2])));
    return { tip: otstup > 12 ? 'свой фон, сбит баланс' : 'свой фон', chuzhaya: false, otstup };
  }
  return { tip: 'свой фон', chuzhaya: false };
}

/** Снимки, которые надо переснимать: сняты не в зале и обработкой не спасаются. */
export const CHUZHAYA_SYEMKA = new Set(['тёмный', 'чисто-белый', 'холодный']);
