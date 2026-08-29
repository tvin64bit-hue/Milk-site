// Готовит кадры блюда: срезает вшитую в картинку подпись у брендированных
// карточек и приводит снимок к квадрату для сетки каталога.
import sharp from 'sharp';
import { najtiGranicuTeksta, centrMassy } from './granica-teksta.mjs';
import { TOP_OSTAVIT_ISKLYUCHENIYA } from './lib-images.mjs';

// Возвращает буферы квадратного кадра и кадра для страницы блюда.
export async function polosaBezTeksta(put, slug, crop = 'top') {
  const { width, height } = await sharp(put).metadata();

  let vysota = height;
  let fon = null;
  let otchet;

  if (crop === 'top') {
    const dolya = TOP_OSTAVIT_ISKLYUCHENIYA[slug];
    if (dolya !== undefined) {
      vysota = Math.round(height * dolya);
      otchet = `подпись срезана вручную на ${Math.round(dolya * 100)}%`;
    } else {
      const najdeno = await najtiGranicuTeksta(put);
      fon = najdeno.fon;
      if (najdeno.granica) {
        vysota = najdeno.granica;
        otchet = `подпись найдена и срезана на ${Math.round((vysota / height) * 100)}% (разрыв ${najdeno.razryv} px)`;
      } else {
        otchet = 'подписи нет, кадр взят целиком';
      }
    }
  }

  const srezano = vysota < height;
  const polosa = srezano
    ? await sharp(put).extract({ left: 0, top: 0, width, height: vysota }).toBuffer()
    : await sharp(put).toBuffer();

  let kvadrat;
  if (srezano) {
    // Квадрат вырезаем из полосы так, чтобы блюдо оказалось в кадре целиком:
    // центрируем его по центру масс, а не по геометрической середине.
    const storona = Math.min(width, vysota);
    if (!fon) fon = (await najtiGranicuTeksta(put)).fon;
    const centr = await centrMassy(put, vysota, fon);
    const left = Math.max(0, Math.min(width - storona, Math.round(centr - storona / 2)));
    kvadrat = await sharp(polosa)
      .extract({ left, top: 0, width: storona, height: storona }).toBuffer();
  } else {
    kvadrat = await sharp(polosa)
      .resize({ width: Math.min(width, height), height: Math.min(width, height), fit: 'cover', position: crop })
      .toBuffer();
  }
  return { kvadrat, polosa, otchet };
}
