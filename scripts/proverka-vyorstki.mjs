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
import { chromium } from 'playwright';

const BAZA = process.argv[2] ?? 'http://localhost:4321/Milk-site';
const STRANICY = ['/', '/menu', '/menu/shakshuka', '/menu/set-hit-n1', '/menu/set-goryachiy', '/404'];
const SHIRINY = [320, 360, 390, 480, 768, 1024, 1280, 1600, 1920];

const PROVERKA = () => {
  const vp = document.documentElement.clientWidth;

  // Прокрутка: пробуем сдвинуть окно и смотрим, сдвинулось ли.
  const bylo = window.scrollX;
  window.scrollTo(vp, 0);
  const prokrutka = window.scrollX > 0;
  window.scrollTo(bylo, 0);

  const obrezaet = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (['hidden', 'auto', 'scroll', 'clip'].includes(o.overflowX)) return true;
    }
    return false;
  };

  const narusheniya = [...document.querySelectorAll('body *')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && (r.right > vp + 1 || r.left < -1))
    .filter(({ el }) => !obrezaet(el))
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${(el.className.baseVal ?? el.className ?? '').toString().trim().split(/\s+/)[0]} (${Math.round(r.left)}…${Math.round(r.right)})`);

  return { prokrutka, narusheniya: [...new Set(narusheniya)] };
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
    const ploho = r.prokrutka || r.narusheniya.length > 0;
    if (ploho) vsegoOshibok++;
    stroki.push(`${shirina}${ploho ? '✗' : '✓'}`);
    if (r.prokrutka) stroki.push(`  ↳ ${shirina}px: страница прокручивается вбок`);
    if (r.narusheniya.length) stroki.push(`  ↳ ${shirina}px: за границами — ${r.narusheniya.slice(0, 4).join(', ')}`);
  }
  console.log(`${put.padEnd(22)} ${stroki.join('  ')}`);
}

await brauzer.close();
console.log(vsegoOshibok ? `\nНайдено проблем: ${vsegoOshibok}` : '\nВёрстка в порядке на всех ширинах.');
process.exit(vsegoOshibok ? 1 : 0);
