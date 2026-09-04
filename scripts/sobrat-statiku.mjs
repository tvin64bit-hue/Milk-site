// Готовит статику для PHP-версии сайта: стили, скрипты и картинки.
//
// Стили лежат в двух местах: общие файлы в src/styles и блоки <style>
// внутри компонентов и страниц Astro. Вторые собираются сюда же, потому
// что в PHP-версии областей видимости у стилей нет — Astro добавлял их
// сам при сборке, а здесь это один общий файл.
//
// Запуск: node scripts/sobrat-statiku.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';

const VYVOD = 'sayt';

// Метка веса. Astro добавлял к селекторам компонентных стилей свой атрибут,
// и это поднимало их вес в каскаде на один класс. Без такой добавки общие
// правила из base.css начинают перебивать компонентные: «p:last-child»
// оказался тяжелее «.sety__podzagolovok», и подзаголовок сетов потерял
// нижний отступ. :not(.__) весит ровно столько же, сколько тот атрибут,
// и восстанавливает прежний порядок, ничего не выбирая сам по себе.
const VES = ':not(.__)';

// Запрет на выполнение чего бы то ни было в папке картинок. Туда админка
// кладёт присланные снимки, и файл с кодом внутри не должен запускаться,
// даже если проверка типа когда-нибудь пропустит подделку.
// Синтаксис Apache 2.2 — на хостинге стоит именно он.
const ZAPRET_ISPOLNENIYA = `# Здесь лежат только картинки. Ничего исполняемого — на всякий случай.
# Отдача таких файлов закрыта совсем: что нельзя скачать, то нельзя и
# запустить. AddHandler cgi-script здесь намеренно не используется — если
# хостинг не даст переопределить Options, он сделал бы ровно обратное.
<FilesMatch "\\.(php|php3|php4|php5|php7|php8|phtml|phps|pl|py|cgi|sh)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Обработчик PHP гасится там, где он есть. Имя модуля у разных сборок своё,
# поэтому перечислены все: без обёртки IfModule незнакомая директива
# роняет сервер пятисотой ошибкой.
<IfModule mod_php.c>
    php_flag engine off
</IfModule>
<IfModule mod_php7.c>
    php_flag engine off
</IfModule>
<IfModule mod_php5.c>
    php_flag engine off
</IfModule>

Options -Indexes
`;

/** Поднимает вес селектора так же, как это делал Astro. */
function sVesom(selektor) {
  return selektor.split(',').map((chast) => {
    // Комментарий перед селектором отделяется: иначе вес прилипал к нему,
    // а само правило оставалось лёгким.
    const nachalo = chast.match(/^(\s*(?:\/\*__\d+__\*\/\s*)*)/)[1];
    const t = chast.slice(nachalo.length).trim();
    if (!t) return chast;
    // Первый составной кусок селектора: до пробела или комбинатора.
    const sovpadenie = t.match(/^([^\s>+~]+)([\s\S]*)$/);
    if (!sovpadenie) return chast;
    return `${nachalo}${sovpadenie[1]}${VES}${sovpadenie[2]}`;
  }).join(', ');
}

/** Достаёт содержимое блоков <style> из файла .astro. */
function stiliIz(fajl) {
  const tekst = readFileSync(fajl, 'utf8');
  const bloki = [...tekst.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  if (!bloki.length) return '';
  // :global(...) нужен был только для обхода областей видимости Astro.
  // Здесь стили общие, поэтому обёртка убирается, а селектор остаётся.
  const bezGlobal = bloki.join('\n').replace(/:global\(([^)]+)\)/g, '$1');

  // Комментарии убираются из-под обработки: внутри них попадаются слова
  // и скобки, и без этого вес приписывался тексту комментария, а само
  // правило оставалось лёгким — так фотография на странице блюда стала
  // квадратной вместо вытянутой.
  const kommentarii = [];
  const bezKommentariev = bezGlobal.replace(/\/\*[\s\S]*?\*\//g, (k) => {
    kommentarii.push(k);
    return `/*__${kommentarii.length - 1}__*/`;
  });

  // Вес добавляется каждому селектору правила. Правила @media и @keyframes,
  // а также шаги анимации вида «to {» остаются как есть.
  //
  // Открывающая скобка в списке начал обязательна: у первого правила внутри
  // @media перед ним стоит именно она, и без неё это правило оставалось
  // лёгким. Так медиазапросы шапки перестали действовать — логотип держал
  // высоту большого экрана, строка не помещалась и уезжала за правый край.
  const sVesami = bezKommentariev
    .replace(/(^|\}|\*\/|\{)([^{}@]+)\{/g, (celoe, nachalo, selektor) => {
      const chistyy = selektor.trim();
      if (!chistyy || /^(from|to|[\d.]+%)/.test(chistyy)) return celoe;
      return `${nachalo}\n  ${sVesom(chistyy)} {`;
    })
    .replace(/\/\*__(\d+)__\*\//g, (_, i) => kommentarii[Number(i)]);

  return `\n/* ---- ${fajl} ---- */\n${sVesami.trim()}\n`;
}

const obshchie = ['src/styles/tokens.css', 'src/styles/base.css', 'src/styles/glavnaya.css'];
const istochniki = [
  ...globSync('src/components/*.astro'),
  'src/layouts/Bazovyy.astro',
  'src/pages/index.astro',
  'src/pages/menu/index.astro',
  'src/pages/menu/[id].astro',
  'src/pages/404.astro',
].filter((f) => existsSync(f));

let css = '/* Стили сайта. Собраны из src/styles и блоков <style> компонентов\n'
  + '   скриптом scripts/sobrat-statiku.mjs — руками этот файл не правят. */\n';
for (const f of obshchie) css += `\n/* ---- ${f} ---- */\n${readFileSync(f, 'utf8').trim()}\n`;
for (const f of istochniki) css += stiliIz(f);

mkdirSync(`${VYVOD}/statika`, { recursive: true });
writeFileSync(`${VYVOD}/statika/sayt.css`, css);

// Скрипты: с TypeScript снимаются типы, получается обычный файл для браузера.
//
// В прежней сборке функции вызывались из встроенного <script> на странице.
// Здесь страница подключает готовый файл, поэтому вызов дописывается сюда же —
// иначе скрипт загрузится и ничего не сделает.
const skripty = {
  dvizhenie: 'nastroitDvizhenie',
  katalog: 'nastroitKatalog',
  vydvizhnaya: 'nastroit',
  lenta: 'lentyProkrutki',
};
mkdirSync('.astro/vhody', { recursive: true });
for (const [imya, vyzov] of Object.entries(skripty)) {
  const vhod = `src/scripts/${imya}.ts`;
  if (!existsSync(vhod)) continue;
  const obertka = `.astro/vhody/${imya}.ts`;
  writeFileSync(obertka, `import { ${vyzov} } from '../../src/scripts/${imya}';\n${vyzov}();\n`);
  execFileSync('node_modules/.bin/esbuild', [
    obertka, '--bundle', '--format=esm', '--target=es2020', '--minify',
    `--outfile=${VYVOD}/statika/${imya}.js`,
  ], { stdio: 'pipe' });
}

// Данные. razmery.json и fony-otchet.json считает конвейер изображений,
// поэтому они обновляются всегда. А menu.json переписывает админка прямо
// на сервере — его копия делается только если файла ещё нет, иначе
// пересборка статики затёрла бы цены, поправленные владельцем.
mkdirSync(`${VYVOD}/dannye/kopii`, { recursive: true });
for (const fajl of ['src/lib/razmery.json', 'src/lib/fony-otchet.json']) {
  cpSync(fajl, `${VYVOD}/dannye/${fajl.split('/').pop()}`);
}
if (!existsSync(`${VYVOD}/dannye/menu.json`)) {
  cpSync('menu.json', `${VYVOD}/dannye/menu.json`);
  console.log('  menu.json скопирован (в sayt/dannye его не было)');
}

// Картинки и значок сайта переносятся как есть: их готовит npm run images.
// Папка proba остаётся дома: её снимки нужны только странице образцов
// дизайна, которой в PHP-версии нет, а на хостинг уехало бы полтора мегабайта.
if (existsSync('public/images')) {
  rmSync(`${VYVOD}/images`, { recursive: true, force: true });
  cpSync('public/images', `${VYVOD}/images`, {
    recursive: true,
    filter: (ot) => !ot.replace(/\\/g, '/').includes('public/images/proba'),
  });
  // Папку пересоздаёт этот же скрипт, поэтому запрет на выполнение пишется
  // здесь: положенный руками файл пропал бы при первой же пересборке.
  // В эту папку admin кладёт снимки, присланные из браузера.
  writeFileSync(`${VYVOD}/images/.htaccess`, ZAPRET_ISPOLNENIYA);
}
// Шрифты. Их скачивает node scripts/shrifty.mjs; пути внутри shrifty.css
// относительные, поэтому подкаталог сайта на них не влияет.
if (existsSync('public/fonts')) {
  rmSync(`${VYVOD}/fonts`, { recursive: true, force: true });
  cpSync('public/fonts', `${VYVOD}/fonts`, { recursive: true });
} else {
  console.log('  ВНИМАНИЕ: public/fonts нет — запустите node scripts/shrifty.mjs');
}

for (const fajl of ['favicon.svg', 'robots.txt']) {
  if (existsSync(`public/${fajl}`)) cpSync(`public/${fajl}`, `${VYVOD}/${fajl}`);
}

const kb = (p) => (readFileSync(p).length / 1024).toFixed(0);
console.log(`Стили: ${kb(`${VYVOD}/statika/sayt.css`)} КБ из ${obshchie.length + istochniki.length} файлов`);
for (const imya of Object.keys(skripty)) {
  if (existsSync(`${VYVOD}/statika/${imya}.js`)) console.log(`  ${imya}.js — ${kb(`${VYVOD}/statika/${imya}.js`)} КБ`);
}
