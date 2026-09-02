// Адрес сайта. Единственное место, где он задан.
//
// Отсюда его берут: astro.config.mjs (site и base), канонические адреса,
// sitemap.xml, Open Graph и функция put() для внутренних ссылок.
//
// Переезд на собственный домен — правка двух строк ниже:
//   ADRES = 'https://kafe-milk.ru'
//   PODKATALOG = '/'
export const ADRES = 'http://milk-site.ru.swtest.ru';
export const PODKATALOG = '/';

/** Полный адрес сайта вместе с подкаталогом — для карточек и подписей. */
export const POLNYY_ADRES = `${ADRES}${PODKATALOG === '/' ? '' : PODKATALOG}`;
