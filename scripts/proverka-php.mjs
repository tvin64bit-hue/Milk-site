// Проверка PHP-версии: каждая страница должна отдаваться целиком.
//
// Смысл проверки в том, что при выключенном показе ошибок сбой в PHP не даёт
// ни сообщения, ни кода 500 — страница просто обрывается посреди разметки.
// Поэтому проверяется не только код ответа, но и закрывающий тег, и журнал
// ошибок, который после прогона должен остаться пустым.
//
// Запуск: node scripts/proverka-php.mjs [адрес]
import { readFileSync, existsSync, rmSync } from 'node:fs';

const BAZA = process.argv[2] ?? 'http://127.0.0.1:8080/milk-site';
const ZHURNAL = 'sayt/dannye/oshibki.log';

const menu = JSON.parse(readFileSync('sayt/dannye/menu.json', 'utf8'));
const adresa = [
  ['/', 200], ['/menu', 200], ['/404', 404], ['/menu/net-takoy-pozicii', 404],
  ...menu.items.map((b) => [`/menu/${b.id}`, 200]),
];

if (existsSync(ZHURNAL)) rmSync(ZHURNAL);

let plohih = 0;
let proverено = 0;

// Карта сайта проверяется отдельно: это XML, у неё нет ни </html>, ни H1,
// зато должны быть все адреса меню — иначе поисковик не увидит новые блюда.
for (const put of ['/sitemap.xml', '/sitemap-index.xml']) {
  const otvet = await fetch(`${BAZA}${put}`);
  const tekst = await otvet.text();
  const bylo = (tekst.match(/<loc>/g) ?? []).length;
  const nado = menu.items.length + 2;
  const oshibki = [];
  if (otvet.status !== 200) oshibki.push(`код ${otvet.status}, ждали 200`);
  if (bylo !== nado) oshibki.push(`адресов ${bylo}, ждали ${nado}`);
  if (!tekst.includes('</urlset>')) oshibki.push('карта оборвана — нет </urlset>');
  if (oshibki.length) { plohih++; console.log(`✗ ${put}: ${oshibki.join('; ')}`); }
  proverено++;
}

for (const [put, ozhidaemyy] of adresa) {
  const otvet = await fetch(`${BAZA}${put}`);
  const tekst = await otvet.text();
  const oshibki = [];
  if (otvet.status !== ozhidaemyy) oshibki.push(`код ${otvet.status}, ждали ${ozhidaemyy}`);
  if (!tekst.includes('</html>')) oshibki.push('страница оборвана — нет </html>');
  if (!tekst.includes('<h1')) oshibki.push('нет заголовка H1');
  if (tekst.includes('Fatal error') || tekst.includes('Warning:')) oshibki.push('в разметке текст ошибки PHP');
  if (oshibki.length) {
    plohih++;
    console.log(`✗ ${put}: ${oshibki.join('; ')}`);
  }
  proverено++;
}

console.log(`\nПроверено адресов: ${proverено}`);
if (existsSync(ZHURNAL)) {
  const zhurnal = readFileSync(ZHURNAL, 'utf8').trim();
  if (zhurnal) {
    console.log('\nВ журнале ошибок PHP:');
    console.log(zhurnal.split('\n').slice(0, 10).join('\n'));
    plohih++;
  }
} else {
  console.log('Журнал ошибок пуст.');
}

console.log(plohih ? `\nПроблем: ${plohih}` : '\nВсе страницы отдаются целиком.');
process.exit(plohih ? 1 : 0);
