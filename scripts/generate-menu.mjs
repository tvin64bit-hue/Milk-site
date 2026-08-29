// Разовый генератор menu.json из таблиц раздела 10.6 технического задания.
// Запускать вручную: node scripts/generate-menu.mjs
// После первой генерации источником истины становится сам menu.json.
import { readFileSync, writeFileSync } from 'node:fs';

const CATEGORIES = [
  { heading: 'Завтраки',            id: 'zavtraki',          name: 'Завтраки' },
  { heading: 'Сеты',                id: 'sety',              name: 'Сеты' },
  { heading: 'Роллы холодные',      id: 'rolly-holodnye',    name: 'Роллы холодные' },
  { heading: 'Роллы темпура',       id: 'rolly-tempura',     name: 'Роллы темпура' },
  { heading: 'Роллы запечённые',    id: 'rolly-zapechennye', name: 'Роллы запечённые' },
  { heading: 'Детские роллы',       id: 'detskie-rolly',     name: 'Детские роллы' },
  { heading: 'Пицца',               id: 'picca',             name: 'Пицца' },
  { heading: 'Паста',               id: 'pasta',             name: 'Паста' },
  { heading: 'Супы и салаты',       id: 'supy-salaty',       name: 'Супы и салаты' },
  { heading: 'Горячее и закуски',   id: 'goryachee-zakuski', name: 'Горячее и закуски' },
  { heading: 'Десерты',             id: 'deserty',           name: 'Десерты' },
  { heading: 'Кофе и напитки',      id: 'kofe-napitki',      name: 'Кофе и напитки' },
];

// Позиции, для которых в Referens/Menu нет исходного снимка (выводится заглушка).
const BEZ_FOTO = new Set(['kaliforniya-s-krevetkoy', 's-krevetkoy-tempura', 'set-goryachiy']);

// Опечатка в ТЗ: файл — брендированная квадратная карточка, значит crop должен быть top.
const CROP_FIX = { 'goryachiy-shokolad-350-ml': 'top' };

const tz = readFileSync('TZ-sayt-kafe-milk.md', 'utf8').split('\n');

const cells = (line) => line.slice(1, -1).split('|').map((s) => s.trim());
const dash = (v) => (v === '—' || v === '' ? null : v);
const num = (v) => (dash(v) === null ? null : Number(v.replace(/[^\d]/g, '')));

const items = [];
let current = null;

for (const line of tz) {
  const heading = line.match(/^### (.+?) — \d+ позиц/);
  if (heading) {
    current = CATEGORIES.find((c) => c.heading === heading[1]) ?? null;
    continue;
  }
  if (!current || !line.startsWith('| ')) continue;

  const c = cells(line);
  if (c.length !== 8) continue;
  const slug = c[5].match(/^`([a-z0-9-]+)`$/)?.[1];
  if (!slug) continue; // строка заголовка таблицы или разделитель

  const badges = dash(c[7]) === null ? [] : c[7].split(/\s+/).map((b) => b.replace(/`/g, ''));
  const item = {
    id: slug,
    category: current.id,
    name: c[0],
    description: c[1],
    weight: dash(c[2]) ?? '',
    price: num(c[3]),
    oldPrice: num(c[4]),
    image: BEZ_FOTO.has(slug) ? null : `${slug}.webp`,
    crop: CROP_FIX[slug] ?? c[6],
    badges,
    available: true,
  };
  // У сетов состав дополнительно раскладывается списком входящих роллов.
  if (current.id === 'sety') item.setItems = c[1].split(', ');
  items.push(item);
}

const menu = {
  updated: '[ЗАПОЛНИТЬ дату]',
  categories: CATEGORIES.map((c, i) => ({ id: c.id, name: c.name, order: i + 1 })),
  items,
};

writeFileSync('menu.json', JSON.stringify(menu, null, 2) + '\n', 'utf8');
console.log(`Позиций: ${items.length}, категорий: ${menu.categories.length}`);
for (const c of menu.categories) {
  console.log(`  ${c.name}: ${items.filter((i) => i.category === c.id).length}`);
}
console.log('Без фото:', items.filter((i) => i.image === null).map((i) => i.id).join(', '));
console.log('crop=top:', items.filter((i) => i.crop === 'top').length);
