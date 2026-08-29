// Сопоставляет 91 позицию меню с исходными файлами из Referens/Menu.
import { readdirSync } from 'node:fs';
import { chitatMenu, nazvanieIzImeni, ISHODNIKI_BLYUDA } from './lib-images.mjs';

// Исходные имена, которые не сводятся к названию позиции автоматически.
const VRUCHNUYU = {
  'mini-s-ogurcom': 'Мини с оогурцом',        // опечатка в исходном файле
  'set-tempura-mix': 'Сет  Темпура Мix ',     // латинская x в исходнике
};

const norm = (s) => s.toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[«»"„“”]/g, '')
  .replace(/^пицца\s+/, '')
  .replace(/^сет\s+/, 'сет ')
  .replace(/\s*\(\d+\s*мл\)\s*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function sopostavit() {
  const menu = chitatMenu();
  const faily = readdirSync(ISHODNIKI_BLYUDA).filter((f) => f.endsWith('.jpeg'));
  const poNazvaniyu = new Map();
  for (const f of faily) {
    const kluch = norm(nazvanieIzImeni(f));
    if (!poNazvaniyu.has(kluch)) poNazvaniyu.set(kluch, f);
  }

  const rezultat = new Map();
  const bezFaila = [];
  for (const item of menu.items) {
    if (item.image === null) continue;
    const kluch = VRUCHNUYU[item.id] ? norm(VRUCHNUYU[item.id]) : norm(item.name);
    const file = poNazvaniyu.get(kluch);
    if (file) rezultat.set(item.id, file);
    else bezFaila.push(item);
  }
  const ispolzovano = new Set(rezultat.values());
  const lishnie = faily.filter((f) => !ispolzovano.has(f));
  return { menu, rezultat, bezFaila, lishnie };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { rezultat, bezFaila, lishnie } = sopostavit();
  console.log(`Сопоставлено: ${rezultat.size}`);
  console.log(`Не нашли файл (${bezFaila.length}):`, bezFaila.map((i) => `${i.id} / ${i.name}`).join(' | ') || '—');
  console.log(`Файлы без позиции (${lishnie.length}):`, lishnie.map((f) => nazvanieIzImeni(f)).join(' | ') || '—');
}
