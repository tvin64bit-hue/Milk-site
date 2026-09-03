// Переносит в PHP-версию выверенную графику: контуры дудлов и формы блобов.
// Копировать их руками нельзя — это сотни координат, ошибка в одной цифре
// незаметна в коде и заметна на экране.
//
// Запуск: node scripts/sobrat-grafiku.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { FORMY_BLOBA } from './blob.mjs';

// Контуры дудлов лежат внутри компонента Astro как обычный объект.
const istochnik = readFileSync('src/components/Dudl.astro', 'utf8');
const kusok = istochnik.match(/const DUDLY: Record<ImyaDudla, string\[\]> = \{([\s\S]*?)\n\};/);
if (!kusok) throw new Error('Не найден список дудлов в src/components/Dudl.astro');

// Объект записан как код TypeScript: разбираем его тем же движком,
// предварительно убрав склейку строк переносами.
const tekst = kusok[1].replace(/'\s*\+\s*'/g, '');
const dudly = new Function(`return {${tekst}}`)();

const vPhp = (znachenie) => JSON.stringify(znachenie, null, 4)
  .replace(/^\[/gm, '[').replace(/"/g, "'");

let php = `<?php
// Графика сайта: контуры дудлов и формы блоб-масок.
//
// Файл собран скриптом scripts/sobrat-grafiku.mjs из тех же исходников,
// что и прежняя сборка, — руками его не правят. Формы блобов зависят
// от MYAGKOST в scripts/blob.mjs; после её изменения скрипт перезапускают.

declare(strict_types=1);

/** Контуры восьми фирменных дудлов и служебной метки, в системе 48×48. */
const DUDLY = [
`;
for (const [imya, puti] of Object.entries(dudly)) {
  php += `    '${imya}' => [\n`;
  for (const p of puti) php += `        '${p}',\n`;
  php += `    ],\n`;
}
php += `];

/** Четыре формы блоб-маски в долях от 0 до 1. */
const FORMY_BLOBA = [
`;
for (const d of FORMY_BLOBA) php += `    '${d}',\n`;
php += `];\n`;

writeFileSync('sayt/app/grafika.php', php);
console.log(`Дудлов: ${Object.keys(dudly).length}, форм блоба: ${FORMY_BLOBA.length}`);
console.log(`Записано в sayt/app/grafika.php (${(php.length / 1024).toFixed(1)} КБ)`);
