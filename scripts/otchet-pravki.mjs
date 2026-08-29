// Отчёт по нормализации: что прошло, что ослаблено, что отброшено.
// Проверка идёт по области еды, а не по фону: портится именно еда.
//
// Запуск: node scripts/otchet-pravki.mjs
import { sopostavit } from './sopostavit.mjs';
import { polosaBezTeksta } from './obrezka.mjs';
import { pravitFon, celevoyFon } from './pravka-fona.mjs';
import { tipFona } from './opredelit-fon.mjs';
import { PREDELY } from './zamer-edy.mjs';
import { ISHODNIKI_BLYUDA } from './lib-images.mjs';

const { menu, rezultat } = sopostavit();
const { kvadrat: etalon } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${rezultat.get('shakshuka')}`, 'shakshuka', 'center');
const cel = celevoyFon((await tipFona(etalon, 'shakshuka')).yarkost);

console.log(`Пороги: тон ≤ ${PREDELY.ton}°, падение насыщенности ≤ ${PREDELY.nasyshchennost} п., изменение яркости ≤ ${PREDELY.yarkost} %\n`);
console.log('позиция'.padEnd(34) + 'сила  тон    насыщ   яркость  итог');

const svodka = { polnaya: 0, oslablena: 0, otbrosheno: 0, bezZamera: 0 };
for (const item of menu.items) {
  const file = rezultat.get(item.id);
  if (!file) continue;
  const { kvadrat } = await polosaBezTeksta(`${ISHODNIKI_BLYUDA}/${file}`, item.id, item.crop);
  const r = await pravitFon(kvadrat, item.id, cel);
  if (!r.chto || r.chto.startsWith('плотный кроп')) continue;

  const o = r.ocenka;
  const itog = !r.ocenka ? 'еду измерить не удалось'
    : r.sila === 0 ? 'отброшено'
    : r.sila === 1 ? 'полная' : `ослаблена ${r.sila}`;
  if (!o) svodka.bezZamera++;
  else if (r.sila === 0) svodka.otbrosheno++;
  else if (r.sila === 1) svodka.polnaya++;
  else svodka.oslablena++;

  console.log(
    item.id.padEnd(34)
    + String(r.sila ?? '—').padEnd(6)
    + (o ? `${o.ton.toFixed(1)}°`.padStart(6) : '     —')
    + (o ? `${o.nasyshchennost >= 0 ? '-' : '+'}${Math.abs(o.nasyshchennost).toFixed(1)}`.padStart(8) : '       —')
    + (o ? `${o.yarkost.toFixed(1)}%`.padStart(9) : '        —')
    + '  ' + itog,
  );
}
console.log(`\nПолная правка: ${svodka.polnaya}, ослаблена: ${svodka.oslablena}, отброшено: ${svodka.otbrosheno}, без замера еды: ${svodka.bezZamera}`);
