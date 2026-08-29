// Общие настройки обработки изображений.
import { readFileSync } from 'node:fs';

export const ISHODNIKI_BLYUDA = 'Referens/Menu';
export const ISHODNIKI_FOTO = 'Referens';
export const VYVOD = 'public/images';

// Доля высоты, которую оставляем у брендированных карточек с crop: top.
// В нижней части такой картинки вшит текст с названием — его надо срезать.
export const TOP_OSTAVIT = 0.6;

// Точечные поправки для карточек, где фотография вплотную касается подписи
// и автоматический поиск разрыва невозможен. Доля высоты, которую оставляем.
// У всех семи пицц один шаблон: блюдо заканчивается на 69% высоты,
// сразу под ним начинается заголовок.
export const TOP_OSTAVIT_ISKLYUCHENIYA = {
  'picca-4-syra': 0.69,
  'picca-pepperoni': 0.69,
  'picca-karbonara': 0.69,
  'picca-italyanskaya': 0.69,
  'picca-gavayskaya': 0.69,
  'picca-chiken-fresh': 0.69,
  'picca-korrida': 0.69,
};

export const KACHESTVO_WEBP = 82;
export const KACHESTVO_JPEG = 84;

export function chitatMenu() {
  return JSON.parse(readFileSync('menu.json', 'utf8'));
}

// Имена исходных файлов содержат неразрывный пробел перед «руб.»,
// поэтому сопоставляем по началу строки до « - купить за».
export function nazvanieIzImeni(file) {
  return file.split(' - купить за')[0].replace(/\s+/g, ' ').trim();
}
