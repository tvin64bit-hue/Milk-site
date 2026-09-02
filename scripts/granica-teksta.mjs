// Определяет, где у брендированной карточки заканчивается фотография
// и начинается вшитый текст с названием блюда.
//
// Устройство таких карточек: сверху фото на однотонной плашке, снизу текст
// на той же плашке, между ними — полоса чистого фона. Ищем эту полосу
// и режем по её нижнему краю: текст уходит, продукт остаётся целиком.
import sharp from 'sharp';

const PROG_OTLICHIYA = 26;  // насколько пиксель должен отличаться от фона, чтобы считаться «не фоном»
const PROG_PUSTOTY = 0.012; // доля «не фоновых» пикселей, при которой строка считается пустой
const ISKAT_OT = 0.34;      // разрыв ищем ниже этой доли высоты
const ISKAT_DO = 0.94;      // и выше этой
const MIN_RAZRYV = 0.008;   // минимальная ширина разрыва в долях высоты

// Возвращает горизонтальный центр масс «не фоновых» пикселей полосы —
// по нему выравнивается квадрат, чтобы блюдо не ушло за край кадра.
export async function centrMassy(put, vysotaPolosy, fon) {
  const { data, info } = await sharp(put)
    .extract({ left: 0, top: 0, width: (await sharp(put).metadata()).width, height: vysotaPolosy })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  let summa = 0, ves = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * ch;
      if (Math.abs(data[p] - fon[0]) + Math.abs(data[p + 1] - fon[1]) + Math.abs(data[p + 2] - fon[2]) > PROG_OTLICHIYA) {
        summa += x; ves++;
      }
    }
  }
  return ves ? summa / ves : w / 2;
}

export async function najtiGranicuTeksta(put) {
  const { data, info } = await sharp(put)
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  // Цвет плашки берём по левому краю нижней трети — там всегда чистый фон.
  const fon = medianaOblasti(data, w, ch, 0, Math.round(h * 0.72), 8, Math.round(h * 0.24));

  // Для каждой строки — доля пикселей, непохожих на фон.
  const dolya = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let inye = 0;
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * ch;
      if (Math.abs(data[p] - fon[0]) + Math.abs(data[p + 1] - fon[1]) + Math.abs(data[p + 2] - fon[2]) > PROG_OTLICHIYA) inye++;
    }
    dolya[y] = inye / w;
  }

  // Собираем отрезки пустых строк внутри зоны поиска.
  const otrezki = [];
  let nachalo = null;
  const ot = Math.round(h * ISKAT_OT);
  const doo = Math.round(h * ISKAT_DO);
  for (let y = ot; y <= doo; y++) {
    if (dolya[y] < PROG_PUSTOTY) {
      if (nachalo === null) nachalo = y;
    } else if (nachalo !== null) {
      otrezki.push([nachalo, y - 1]);
      nachalo = null;
    }
  }
  if (nachalo !== null) otrezki.push([nachalo, doo]);

  // Годится только разрыв заметной ширины, ниже которого действительно есть текст.
  const minRazryv = Math.max(4, Math.round(h * MIN_RAZRYV));
  const skontentom = otrezki.filter(([nach, konec]) => {
    if (konec - nach + 1 < minRazryv) return false;
    for (let y = konec + 1; y < h; y++) if (dolya[y] >= PROG_PUSTOTY) return true;
    return false;
  });
  if (!skontentom.length) return { granica: null, fon };

  // Берём самый верхний: между заголовком и составом разрыв бывает шире,
  // чем между фотографией и заголовком, поэтому «самый широкий» не годится.
  const [nach, kon] = skontentom[0];
  // Режем по низу разрыва, оставляя небольшой воздух под фотографией.
  return { granica: Math.min(kon + 1, h), razryv: kon - nach + 1, fon };
}

function medianaOblasti(data, w, ch, x0, y0, sw, sh) {
  const r = [], g = [], b = [];
  for (let y = y0; y < y0 + sh; y++) {
    for (let x = x0; x < x0 + sw; x++) {
      const p = (y * w + x) * ch;
      r.push(data[p]); g.push(data[p + 1]); b.push(data[p + 2]);
    }
  }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  return [med(r), med(g), med(b)];
}
