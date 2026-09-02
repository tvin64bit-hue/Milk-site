// Проверка вёрстки на всех ключевых ширинах.
//
// Проверяются две разные вещи, и обе нужны:
//   1) реально ли страница прокручивается вбок;
//   2) не выходят ли элементы за границы вьюпорта.
//
// Одного scrollWidth недостаточно и он же обманывает: при overflow-x: hidden
// на body значение documentElement.scrollWidth показывает необрезанные
// размеры, поэтому признаком прокрутки служит попытка прокрутить окно.
// А выход за границы считается только для элементов, которых не обрезает
// ни один предок, — иначе в нарушители попадают ленты и бегущая строка.
//
// Запуск: node scripts/proverka-vyorstki.mjs [адрес]
import { chromium, devices } from 'playwright';

const BAZA = process.argv[2] ?? 'http://localhost:4321/Milk-site';
const STRANICY = ['/', '/menu', '/menu/shakshuka', '/menu/set-hit-n1', '/menu/set-goryachiy', '/404'];
const SHIRINY = [320, 360, 390, 480, 768, 1024, 1280, 1600, 1920];
const MOBILNYE = ['iPhone 13', 'iPhone SE', 'Pixel 5'];
const STRANICY_MOBILNYE = ['/', '/menu', '/menu/shakshuka'];

const PROVERKA = () => {
  const vp = document.documentElement.clientWidth;

  // Прокрутка: пробуем сдвинуть окно и смотрим, сдвинулось ли.
  const bylo = window.scrollX;
  window.scrollTo(vp, 0);
  const prokrutka = window.scrollX > 0;
  window.scrollTo(bylo, 0);

  // Ширина документа при снятой маскировке. overflow-x: hidden на body не
  // убирает переполнение, а прячет его: страница выглядит целой, но
  // мобильный браузер расширяет под содержимое область раскладки, и
  // position: fixed шапка растягивается вместе с ней — правый её край с
  // кнопкой меню уезжает за экран. Поэтому меряем без маскировки.
  const bylOverflow = [document.documentElement.style.overflowX, document.body.style.overflowX];
  document.documentElement.style.overflowX = 'visible';
  document.body.style.overflowX = 'visible';
  const shirinaDokumenta = document.documentElement.scrollWidth;
  // innerWidth больше clientWidth означает ровно эту раздутую раскладку.
  const razdutayaRaskladka = window.innerWidth > vp + 1;

  // Предок обрезает потомка только если он для него containing block.
  // Для absolute это ближайший позиционированный предок, для fixed —
  // вьюпорт. Прежняя проверка считала любой overflow защитой и поэтому
  // не увидела подписи для скринридеров, торчавшие из ленты сетов.
  const obrezaet = (el) => {
    const poz = getComputedStyle(el).position;
    if (poz === 'fixed') return false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const o = getComputedStyle(p);
      const rezhet = ['hidden', 'auto', 'scroll', 'clip'].includes(o.overflowX);
      if (poz === 'absolute') {
        const soderzhit = o.position !== 'static' || o.transform !== 'none' || o.filter !== 'none';
        if (rezhet && soderzhit) return true;
        if (soderzhit) return false;   // containing block найден, и он не режет
      } else if (rezhet) {
        return true;
      }
    }
    return false;
  };

  const narusheniya = [...document.querySelectorAll('body *')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && (r.right > vp + 1 || r.left < -1))
    .filter(({ el }) => !obrezaet(el))
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${(el.className.baseVal ?? el.className ?? '').toString().trim().split(/\s+/)[0]} (${Math.round(r.left)}…${Math.round(r.right)})`);

  document.documentElement.style.overflowX = bylOverflow[0];
  document.body.style.overflowX = bylOverflow[1];

  return {
    prokrutka, razdutayaRaskladka,
    shireEkrana: shirinaDokumenta > vp + 1 ? shirinaDokumenta : 0,
    narusheniya: [...new Set(narusheniya)],
  };
};

const brauzer = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const stranica = await brauzer.newPage({ viewport: { width: 1280, height: 900 } });
// Внешние шрифты только замедляют проверку.
await stranica.route('**://fonts.g**', (r) => r.abort());

let vsegoOshibok = 0;
for (const put of STRANICY) {
  await stranica.goto(`${BAZA}${put}`, { waitUntil: 'load' });
  await stranica.waitForTimeout(250);
  const stroki = [];
  for (const shirina of SHIRINY) {
    await stranica.setViewportSize({ width: shirina, height: 900 });
    await stranica.waitForTimeout(160);
    const r = await stranica.evaluate(PROVERKA);
    const ploho = r.prokrutka || r.shireEkrana || r.narusheniya.length > 0;
    if (ploho) vsegoOshibok++;
    stroki.push(`${shirina}${ploho ? '✗' : '✓'}`);
    if (r.prokrutka) stroki.push(`  ↳ ${shirina}px: страница прокручивается вбок`);
    if (r.shireEkrana) stroki.push(`  ↳ ${shirina}px: документ шире экрана — ${r.shireEkrana}px`);
    if (r.narusheniya.length) stroki.push(`  ↳ ${shirina}px: за границами — ${r.narusheniya.slice(0, 4).join(', ')}`);
  }
  console.log(`${put.padEnd(22)} ${stroki.join('  ')}`);
}

// Отдельный прогон на настоящих телефонах. Узкое окно десктопного браузера
// и телефон ведут себя по-разному: телефон расширяет область раскладки под
// содержимое, и переполнение, незаметное в окне, там ломает шапку.
console.log('\nНа мобильных устройствах:');
for (const imya of MOBILNYE) {
  const kontekst = await brauzer.newContext({ ...devices[imya] });
  const tel = await kontekst.newPage();
  await tel.route('**://fonts.g**', (r) => r.abort());
  const stroki = [];
  for (const put of STRANICY_MOBILNYE) {
    await tel.goto(`${BAZA}${put}`, { waitUntil: 'load' });
    await tel.waitForTimeout(250);
    const r = await tel.evaluate(PROVERKA);
    const ploho = r.prokrutka || r.razdutayaRaskladka || r.shireEkrana || r.narusheniya.length > 0;
    if (ploho) vsegoOshibok++;
    stroki.push(`${put}${ploho ? '✗' : '✓'}`);
    if (r.razdutayaRaskladka) stroki.push(`  ↳ ${put}: раскладка раздута до ${await tel.evaluate(() => innerWidth)}px`);
    if (r.shireEkrana) stroki.push(`  ↳ ${put}: документ шире экрана — ${r.shireEkrana}px`);
    if (r.narusheniya.length) stroki.push(`  ↳ ${put}: за границами — ${r.narusheniya.slice(0, 4).join(', ')}`);
  }
  console.log(`${imya.padEnd(12)} ${stroki.join('  ')}`);
  await kontekst.close();
}

await brauzer.close();
console.log(vsegoOshibok ? `\nНайдено проблем: ${vsegoOshibok}` : '\nВёрстка в порядке на всех ширинах и на телефонах.');
process.exit(vsegoOshibok ? 1 : 0);
