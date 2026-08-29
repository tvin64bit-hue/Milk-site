// Печатает таблицу фонов по всем снимкам: яркость и цветность отдельными
// колонками. Запуск: node scripts/otchet-fon.mjs
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { tipFona, CHUZHAYA_SYEMKA, ETALON_FONA } from './opredelit-fon.mjs';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';

const { menu, rezultat } = sopostavit();
const stroki = [];
for (const item of menu.items) {
  const file = rezultat.get(item.id);
  if (!file) continue;
  const { kvadrat } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${file}`, item.id, item.crop);
  stroki.push({ id: item.id, kategoriya: item.category, ...(await tipFona(kvadrat, item.id)) });
}

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
console.log(`Эталон (угловой фон shakshuka): ${hex(ETALON_FONA)}  яркость ${Math.round(0.299 * 162 + 0.587 * 154 + 0.114 * 140)}  R-B +${ETALON_FONA[0] - ETALON_FONA[2]}\n`);

const svodka = {};
for (const s of stroki) (svodka[s.tip] ??= []).push(s);
console.log('Сводка:');
for (const [tip, list] of Object.entries(svodka).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${tip.padEnd(24)} ${String(list.length).padStart(3)}${CHUZHAYA_SYEMKA.has(tip) ? '  ← чужая съёмка' : ''}`);
}

console.log('\nЧужая съёмка — на пересъёмку:');
console.log('  ' + 'позиция'.padEnd(38) + 'тип'.padEnd(14) + 'фон'.padEnd(10) + 'яркость  цветность  разброс');
for (const s of stroki.filter((x) => x.chuzhaya).sort((a, b) => a.tip.localeCompare(b.tip) || a.id.localeCompare(b.id))) {
  console.log(`  ${s.id.padEnd(38)}${s.tip.padEnd(14)}${hex(s.rgb).padEnd(10)}${String(s.yarkost).padStart(6)}  ${((s.teplo >= 0 ? '+' : '') + s.teplo).padStart(9)}  ${String(s.razbros).padStart(7)}`);
}

console.log('\nСвой фон со сбитым балансом — нормализуются:');
for (const s of stroki.filter((x) => x.tip === 'свой фон, сбит баланс').sort((a, b) => b.otstup - a.otstup)) {
  console.log(`  ${s.id.padEnd(38)}${hex(s.rgb).padEnd(10)}${String(s.yarkost).padStart(6)}  ${(s.teplo >= 0 ? '+' : '') + s.teplo}   отступ от эталона ${s.otstup}`);
}
