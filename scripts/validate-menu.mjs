// Проверяет menu.json перед сборкой. Падает с понятным сообщением на русском,
// чтобы владелец сайта видел, что именно он сломал при правке.
import { readFileSync, existsSync } from 'node:fs';

const BADGES = ['hit', 'detskoe', 'ostroe', 'dobavka'];
const CROPS = ['top', 'center', 'bottom'];

const oshibki = [];
const preduprezhdeniya = [];
const gde = (item, i) => `позиция ${i + 1}${item?.id ? ` («${item.id}»)` : ''}`;

let menu;
try {
  menu = JSON.parse(readFileSync('menu.json', 'utf8'));
} catch (e) {
  console.error('\n  Файл menu.json не читается — скорее всего, потеряна запятая или кавычка.');
  console.error(`  Подробности: ${e.message}\n`);
  process.exit(1);
}

if (typeof menu.updated !== 'string' || !menu.updated) {
  oshibki.push('В начале файла не заполнено поле "updated" — дата актуальности цен.');
}
if (!Array.isArray(menu.categories) || menu.categories.length === 0) {
  oshibki.push('Раздел "categories" пуст или отсутствует.');
}
if (!Array.isArray(menu.items) || menu.items.length === 0) {
  oshibki.push('Раздел "items" пуст или отсутствует.');
}
if (oshibki.length) vyvesti();

const idKategoriy = new Set();
menu.categories.forEach((c, i) => {
  if (!c.id) oshibki.push(`Категория ${i + 1}: не указан "id".`);
  else if (idKategoriy.has(c.id)) oshibki.push(`Категория «${c.id}» описана дважды.`);
  else idKategoriy.add(c.id);
  if (!c.name) oshibki.push(`Категория «${c.id ?? i + 1}»: не указано название "name".`);
  if (typeof c.order !== 'number') oshibki.push(`Категория «${c.id ?? i + 1}»: "order" должен быть числом.`);
});

const idBlyud = new Set();
menu.items.forEach((it, i) => {
  for (const pole of ['id', 'category', 'name', 'description']) {
    if (typeof it[pole] !== 'string' || !it[pole].trim()) {
      oshibki.push(`${gde(it, i)}: не заполнено обязательное поле "${pole}".`);
    }
  }
  if (it.id) {
    if (idBlyud.has(it.id)) oshibki.push(`Слаг «${it.id}» встречается больше одного раза — адреса страниц совпадут.`);
    else idBlyud.add(it.id);
    if (!/^[a-z0-9-]+$/.test(it.id)) {
      oshibki.push(`${gde(it, i)}: в "id" можно использовать только латинские строчные буквы, цифры и дефис.`);
    }
  }
  if (it.category && !idKategoriy.has(it.category)) {
    oshibki.push(`${gde(it, i)}: категории «${it.category}» нет в списке categories.`);
  }
  if (typeof it.price !== 'number' || !Number.isFinite(it.price) || it.price <= 0) {
    oshibki.push(`${gde(it, i)}: "price" должна быть числом больше нуля, без пробелов и знака ₽.`);
  }
  if (it.oldPrice !== null && (typeof it.oldPrice !== 'number' || it.oldPrice <= 0)) {
    oshibki.push(`${gde(it, i)}: "oldPrice" — либо число, либо null.`);
  }
  if (typeof it.oldPrice === 'number' && typeof it.price === 'number' && it.oldPrice <= it.price) {
    preduprezhdeniya.push(`${gde(it, i)}: старая цена (${it.oldPrice}) не больше новой (${it.price}) — зачёркивание будет выглядеть странно.`);
  }
  if (it.weight !== undefined && typeof it.weight !== 'string') {
    oshibki.push(`${gde(it, i)}: "weight" — строка, например "300 г". Если веса нет, оставьте "".`);
  }
  if (!CROPS.includes(it.crop)) {
    oshibki.push(`${gde(it, i)}: "crop" должен быть ${CROPS.map((c) => `"${c}"`).join(', ')}.`);
  }
  if (!Array.isArray(it.badges)) {
    oshibki.push(`${gde(it, i)}: "badges" — список, например [] или ["hit"].`);
  } else {
    for (const b of it.badges) {
      if (!BADGES.includes(b)) {
        oshibki.push(`${gde(it, i)}: метки «${b}» не существует. Допустимы: ${BADGES.join(', ')}.`);
      }
    }
  }
  if (typeof it.available !== 'boolean') {
    oshibki.push(`${gde(it, i)}: "available" — true или false, без кавычек.`);
  }
  if (it.image !== null && (typeof it.image !== 'string' || !it.image)) {
    oshibki.push(`${gde(it, i)}: "image" — имя файла строкой или null, если фотографии нет.`);
  }
  // Отсутствие файла на диске сборку не ломает — подставится заглушка.
  if (typeof it.image === 'string') {
    const bezRasshireniya = it.image.replace(/\.[a-z0-9]+$/i, '');
    if (!existsSync(`public/images/menu/${bezRasshireniya}-kv-540.webp`)) {
      preduprezhdeniya.push(`${gde(it, i)}: файла фотографии нет в public/images/menu — покажем заглушку. Запустите «npm run images».`);
    }
  }
  if (it.setItems !== undefined && !Array.isArray(it.setItems)) {
    oshibki.push(`${gde(it, i)}: "setItems" — список названий роллов.`);
  }
});

vyvesti();

function vyvesti() {
  if (preduprezhdeniya.length) {
    console.warn(`\n  Предупреждения (${preduprezhdeniya.length}) — сборке не мешают:`);
    for (const p of preduprezhdeniya.slice(0, 12)) console.warn(`   • ${p}`);
    if (preduprezhdeniya.length > 12) console.warn(`   • …и ещё ${preduprezhdeniya.length - 12}`);
    console.warn('');
  }
  if (oshibki.length) {
    console.error(`\n  В файле menu.json ${oshibki.length} ошибк(и). Сборка остановлена:\n`);
    for (const o of oshibki) console.error(`   • ${o}`);
    console.error('\n  Исправьте menu.json и запустите сборку снова.\n');
    process.exit(1);
  }
  console.log(`  menu.json в порядке: ${menu.items.length} позиций в ${menu.categories.length} категориях.`);
}
