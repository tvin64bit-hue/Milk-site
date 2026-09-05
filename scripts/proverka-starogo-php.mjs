// Проверяет, что файлы, объясняющие поломку, сами исполняются на старом PHP.
//
// Смысл в том, что объяснять причину должен работающий код. Первая версия
// страницы проверки была написана на синтаксисе 7.4 и на хостинге с 7.1 не
// запустилась — вместо диагноза владелец увидел собственный исходник.
//
// Запуск: node scripts/proverka-starogo-php.mjs
import { readFileSync } from 'node:fs';

// Эти файлы должны открываться на любой версии, вплоть до 5.6.
const FAJLY = ['sayt/proverka-ustanovki.php', 'sayt/app/versiya.php'];

const ZAPRETY = [
  [/(?<![\w$>])fn\s*\(/, 'стрелочная функция fn() — с PHP 7.4'],
  [/\?\?=/, 'оператор ??= — с PHP 7.4'],
  [/\?\?/, 'оператор ?? — с PHP 7.0'],
  [/\?->/, 'оператор ?-> — с PHP 8.0'],
  [/(?<![\w$>])match\s*\(/, 'выражение match — с PHP 8.0'],
  [/\bstr_(starts_with|ends_with|contains)\s*\(/, 'функция появилась в PHP 8.0'],
  // Запятая перед ) законна в array(...), но не в вызове функции — до 7.3.
  // Массивы в этих файлах пишутся как [...], поэтому остаются только вызовы.
  [/,\s*\)/, 'запятая перед ) в вызове — с PHP 7.3'],
  [/\bfunction\s+\w+\s*\([^)]*?\b(int|string|bool|float|array|callable|iterable)\s+\$/s,
    'объявление типа у аргумента — с PHP 7.0'],
  // За типом результата идёт тело функции, а не скобка: «: array_slice(»
  // и «: array()» — это тернарный оператор, а не объявление.
  [/\)\s*:\s*(void|int|string|bool|float|array|self|static)\b(?!\s*\()/, 'объявление типа результата — с PHP 7.0'],
  [/\bdeclare\s*\(\s*strict_types/, 'declare(strict_types) — с PHP 7.0'],
  [/\[\s*\.\.\./, 'распаковка массива [...$a] — с PHP 7.4'],
  [/\b(private|public|protected)\s+(int|string|bool|float|array)\s+\$/, 'типизированное свойство — с PHP 7.4'],
];

let plohih = 0;
for (const fajl of FAJLY) {
  const tekst = readFileSync(fajl, 'utf8');
  // Комментарии выбрасываются: в них слова из запретов встречаются законно.
  const kod = tekst
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')
    .replace(/(^|\s)#[^\n]*/g, '$1');
  const najdeno = [];
  for (const [obrazec, pochemu] of ZAPRETY) {
    const sovpadenie = kod.match(obrazec);
    if (sovpadenie) {
      const nomer = kod.slice(0, sovpadenie.index).split('\n').length;
      najdeno.push(`строка ~${nomer}: «${sovpadenie[0].trim()}» — ${pochemu}`);
    }
  }
  if (najdeno.length) {
    plohih += najdeno.length;
    console.log(`✗ ${fajl}`);
    najdeno.forEach((n) => console.log(`    ${n}`));
  } else {
    console.log(`✓ ${fajl} — старого синтаксиса достаточно`);
  }
}

console.log(plohih
  ? `\nНайдено мест, где файл не запустится на старом PHP: ${plohih}`
  : '\nФайлы объяснений исполняются на любой версии PHP.');
process.exit(plohih ? 1 : 0);
