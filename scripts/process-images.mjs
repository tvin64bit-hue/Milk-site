// Готовит все изображения сайта из папки Referens в public/images.
// Referens только читается, исходники не меняются и не переименовываются.
//
// Запуск: npm run images
import { mkdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { pravitFon, celevoyFon } from './pravka-fona.mjs';
import { tipFona } from './opredelit-fon.mjs';
import {
  ISHODNIKI_BLYUDA, ISHODNIKI_FOTO, VYVOD, KACHESTVO_WEBP, KACHESTVO_JPEG,
} from './lib-images.mjs';

// Лайфстайл-кадры: исходное имя файла → осмысленное имя и подпись для alt.
const LAJFSTAJL = {
  'Милк Кафе_65464 записи профиля.jpeg':      ['hero-sup-latte', 'Горячее блюдо с яйцом и капучино на столе кафе «Милк»'],
  'Милк К75675афе_ записи профиля.jpeg':      ['neon-mesto-gde-horosho', 'Зал кафе «Милк» с неоновой надписью «Место, где хорошо»'],
  'Милк Кафе_ записи профиля.jpeg':           ['neon-schastye-kofe', 'Неоновая надпись «Счастье пахнет кофе и тобой» в зале кафе'],
  'Милк Кафе_ записи проф7676иля.jpeg':       ['kofe-love', 'Два стакана кофе с надписью LOVE на сырной пенке'],
  'Милк Кафе_ запиопропрси профиля.jpeg':     ['bar-vitrina', 'Барная стойка кафе «Милк» с витриной десертов и сиропами'],
  'Милк Кафе_ 8профиля.jpeg':                 ['banket-zhemchug', 'Накрытый банкетный стол в зале с жемчужным декором'],
  'Милк Кафе_ записи про765756филя.jpeg':     ['banket-novogodniy', 'Новогодний банкетный стол с ёлкой и закусками'],
  'Милк Кафе_ записи п42342рофиля.jpeg':      ['fotozona-lyustry', 'Фотозона с хрустальными люстрами и цветами'],
  'Милк К654645афе_ записи профиля.jpeg':     ['pavlova-rulet', 'Меренговый рулет с клубникой и мятой'],
  'Милк Кафе_ записи пр656офиля.jpeg':        ['pavlova-dva', 'Два куска торта «Павлова» на белых тарелках'],
  'Милк Кафе_ за4писи профиля.jpeg':          ['pavlova-romashki', 'Десерт «Павлова» с клубникой рядом с ромашками'],
  'Милк Ка76575фе_ записи профиля.jpeg':      ['desert-yolka', 'Новогодний десерт в форме ёлки с ягодами'],
  'Милк Кафе_ з534534аписи профиля.jpeg':     ['kofe-2026', 'Кофе с сырной пенкой и новогодним декором'],
  'Милк Каф6е_ записи проф7иля.jpeg':         ['stol-rolly-limonad', 'Стол с роллами, лимонадом и ромашками'],
  'Милк Кафе_ записи проф7иля.jpeg':          ['rolly-boksy', 'Роллы в доставочных боксах'],
  'Милк Кафе_4 записи профиля.jpeg':          ['rolly-tarelka', 'Тарелка запечённых роллов с васаби и имбирём'],
  'Милк Кафе_ записдлодоли профиля.jpeg':     ['krevetki-ris', 'Креветки с рисом и сливочным соусом'],
};

// Ширины, в которых готовим лайфстайл-кадры.
const SHIRINY_FOTO = [480, 960, 1280];
// Ширины квадратов каталога и кадров страницы блюда.
const SHIRINY_BLYUDA = [320, 540];

const dir = (p) => { mkdirSync(p, { recursive: true }); return p; };

async function sohranit(pipeline, put, shirina) {
  const p = pipeline.clone().resize({ width: shirina, withoutEnlargement: true });
  const info = await p.clone().webp({ quality: KACHESTVO_WEBP }).toFile(`${put}.webp`);
  await p.clone().jpeg({ quality: KACHESTVO_JPEG, mozjpeg: true }).toFile(`${put}.jpg`);
  return info;
}

async function blyuda() {
  const { menu, rezultat, lishnie } = sopostavit();
  const papka = dir(`${VYVOD}/menu`);
  const razmery = {};
  let srezano = 0;
  const pravleno = [];

  // Цель нормализации меряем по эталонному кадру: так shakshuka остаётся
  // сама собой, а остальные подтягиваются к тому, как она выглядит на выходе.
  const etalonFile = rezultat.get('shakshuka');
  const { kvadrat: etalonKadr } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${etalonFile}`, 'shakshuka', 'center');
  const cel = celevoyFon((await tipFona(etalonKadr, 'shakshuka')).yarkost);
  console.log(`  Целевой фон: rgb(${cel.join(', ')}) — цветность эталона при яркости эталонного кадра.`);

  for (const item of menu.items) {
    const file = rezultat.get(item.id);
    if (!file) continue;
    const put = `${ISHODNIKI_BLYUDA}/${file}`;
    const { kvadrat, polosa, otchet } = await polosaBezTeksta(put, item.id, item.crop);
    if (otchet?.includes('срезана')) srezano++;

    // Стоковые снимки на белом, чёрном и холодном сером фоне выпадают из
    // молочной гаммы. Тип фона определяется сам, правка — по типу.
    const { kadr, tip, chto } = await pravitFon(kvadrat, item.id, cel);
    if (chto) pravleno.push({ id: item.id, tip, chto });

    for (const w of SHIRINY_BLYUDA) {
      await sohranit(sharp(kadr), `${papka}/${item.id}-kv-${w}`, w);
    }
    // Кадр для страницы блюда — с исходными пропорциями, не шире 480 px.
    const bolshoe = await sohranit(sharp(polosa), `${papka}/${item.id}-480`, 480);
    const kv = await sharp(kadr).metadata();
    razmery[item.id] = {
      kvadrat: { width: Math.min(kv.width, 540), height: Math.min(kv.width, 540) },
      bolshoe: { width: bolshoe.width, height: bolshoe.height },
    };
  }
  const chuzhie = pravleno.filter((p) => p.chto.startsWith('плотный кроп'));
  const svoi = pravleno.filter((p) => !p.chto.startsWith('плотный кроп'));
  console.log(`  Блюда: ${Object.keys(razmery).length} снимков, у ${srezano} срезана вшитая подпись.`);
  console.log(`  Чужая съёмка, поправлена и идёт на пересъёмку (${chuzhie.length}):`);
  for (const p of chuzhie) console.log(`    • ${p.id} — ${p.tip}`);
  console.log(`  Свой фон, баланс приведён к эталону (${svoi.length}):`);
  console.log(`    ${svoi.map((p) => p.id).join(', ')}`);
  if (lishnie.length) console.log(`  Не использованы: ${lishnie.join(', ')}`);
  return razmery;
}

async function lajfstajl() {
  const papka = dir(`${VYVOD}/photo`);
  const razmery = {};
  for (const [file, [imya, alt]] of Object.entries(LAJFSTAJL)) {
    const put = `${ISHODNIKI_FOTO}/${file}`;
    if (!existsSync(put)) { console.warn(`  Нет исходника: ${file}`); continue; }
    let info;
    for (const w of SHIRINY_FOTO) info = await sohranit(sharp(put), `${papka}/${imya}-${w}`, w);
    const meta = await sharp(put).metadata();
    razmery[imya] = { width: meta.width, height: meta.height, alt };
  }
  console.log(`  Лайфстайл: ${Object.keys(razmery).length} кадров.`);
  return razmery;
}

// Вырезает надпись «Милк» из логотипа по самим буквам: тёмные пиксели
// становятся непрозрачными, акварельная подложка — прозрачной.
// Прямоугольным кадром обойтись нельзя — в шапке был бы виден кусок подложки.
async function nadpisMilk(ishodnik, kuda, cvet = '#3D2B1C') {
  const { data, info } = await sharp(ishodnik)
    // Кадр охватывает только слово «Милк»: дескриптор в шапку не идёт.
    .extract({ left: 150, top: 190, width: 760, height: 170 })
    // Исходник прозрачен по углам — подкладываем белое, иначе там будут тёмные пятна.
    .flatten({ background: '#FFFFFF' })
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const alpha = Buffer.alloc(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += ch) {
    const luma = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    // Плавный переход сохраняет сглаживание краёв букв.
    alpha[i] = Math.round(255 * Math.min(1, Math.max(0, (165 - luma) / 55)));
  }
  const bukvy = await sharp({ create: { width: w, height: h, channels: 3, background: cvet } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png().toBuffer();
  // Обрезаем прозрачные поля, чтобы высота логотипа в шапке задавалась точно.
  await sharp(bukvy).trim({ threshold: 1 }).png().toFile(`${kuda}.png`);
  const meta = await sharp(`${kuda}.png`).metadata();
  return { width: meta.width, height: meta.height };
}

async function logotipy() {
  const papka = dir(`${VYVOD}/logo`);
  // Для шапки нужно только слово «Милк» без дескриптора и без акварельной подложки.
  const milk = await nadpisMilk(`${ISHODNIKI_FOTO}/logo-1.png`, `${papka}/logo-milk`);
  // Светлая версия для тёмного футера: акварельная подложка на --coffee-dark
  // читалась бы как наклейка неправильной формы.
  await nadpisMilk(`${ISHODNIKI_FOTO}/logo-1.png`, `${papka}/logo-milk-svetlyy`, '#F8EEE4');
  // Полный логотип с дескриптором — для футера.
  await sohranit(sharp(`${ISHODNIKI_FOTO}/logo-1.png`), `${papka}/logo-polnyy`, 512);
  // Декоративное кофейное кольцо — блок «О кафе» и страница 404.
  await sohranit(sharp(`${ISHODNIKI_FOTO}/logo-3.png`), `${papka}/logo-dekor`, 512);
  console.log(`  Логотипы: надпись «Милк» ${milk.width}×${milk.height}, полный и декоративный.`);
  return { milk };
}

console.log('Обработка изображений…');
const razmeryBlyud = await blyuda();
const razmeryFoto = await lajfstajl();
const logo = await logotipy();

// Размеры нужны разметке, чтобы задать width/height и не допустить скачков вёрстки.
const { writeFileSync } = await import('node:fs');
writeFileSync('src/lib/razmery.json', JSON.stringify({ blyuda: razmeryBlyud, foto: razmeryFoto, logo }, null, 2) + '\n');
console.log('Готово. Размеры записаны в src/lib/razmery.json');
