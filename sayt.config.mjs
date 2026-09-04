// Адрес сайта. Единственное место, где он задан.
//
// Отсюда его берут: astro.config.mjs (site и base), канонические адреса,
// sitemap.xml, Open Graph и функция put() для внутренних ссылок.
//
// Переезд на собственный домен — правка двух строк ниже:
//   ADRES = 'https://kafe-milk.ru'
//   PODKATALOG = '/'
//
// Те же значения продублированы в sayt/app/konfig.php (BAZA и ADRES) —
// PHP-слой конфиг на JavaScript прочитать не может, поэтому при переезде
// правятся оба файла.
export const ADRES = 'https://web-styles.ru';
export const PODKATALOG = '/milk-site';

/** Полный адрес сайта вместе с подкаталогом — для карточек и подписей. */
export const POLNYY_ADRES = `${ADRES}${PODKATALOG === '/' ? '' : PODKATALOG}`;
