// Предпросмотр страниц WordPress: превращает блочную разметку в обычный HTML
// и подставляет картинки, чтобы результат было видно до вставки в редактор.
//
// Запуск: node scripts/wordpress-predprosmotr.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// Пометка в разметке → файл в папке kartinki.
const KARTINKI = {
  'ЗАМЕНИТЬ-ФОН': '01-fon-pervogo-ekrana.jpg',
  'ЗАМЕНИТЬ-ЗАЛ': '02-zal-neon.jpg',
  'ЗАМЕНИТЬ-ШАКШУКУ': '03-shakshuka.jpg',
  'ЗАМЕНИТЬ-СЕТ': '04-set-hit.jpg',
  'ЗАМЕНИТЬ-ПИЦЦУ': '05-picca-pepperoni.jpg',
  'ЗАМЕНИТЬ-ЛАТТЕ': '06-latte-lavanda.jpg',
  'ЗАМЕНИТЬ-ПЛИТКА-ЗАВТРАКИ': '03-shakshuka.jpg',
  'ЗАМЕНИТЬ-ПЛИТКА-РОЛЛЫ': '07-plitka-rolly.jpg',
  'ЗАМЕНИТЬ-ПЛИТКА-ПИЦЦА': '05-picca-pepperoni.jpg',
  'ЗАМЕНИТЬ-ПЛИТКА-КОФЕ': '08-plitka-kofe.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-1': '09-galereya-bar.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-2': '10-galereya-neon.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-3': '08-plitka-kofe.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-4': '11-galereya-stol.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-5': '12-galereya-pavlova.jpg',
  'ЗАМЕНИТЬ-ГАЛЕРЕЯ-6': '13-galereya-fotozona.jpg',
  'ЗАМЕНИТЬ-ОБЛОЖКА-РОЛЛЫ': '15-oblozhka-rolly.jpg',
  'ЗАМЕНИТЬ-ОБЛОЖКА-ПИЦЦА': '16-oblozhka-picca.jpg',
};

// Базовые стили блоков — то, что на настоящем сайте подставляет сам WordPress.
const STILI = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ЗАГОЛОВОК</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@600;700&family=Onest:wght@400;500;600&display=swap&subset=cyrillic,latin" rel="stylesheet">
<style>
  *{box-sizing:border-box} body{margin:0;font-family:Onest,system-ui,sans-serif;color:#3d2b1c;background:#f8eee4}
  h1,h2,h3{font-family:Rubik,system-ui,sans-serif;margin:0}
  p{margin:0 0 1rem}
  .wp-block-cover{position:relative;display:flex;overflow:hidden;padding:3rem 2rem}
  /* В WordPress заливка лежит НАД фотографией — без z-index картинка
     перекрывала её, и затемнение в предпросмотре не было видно. */
  .wp-block-cover__background{position:absolute;inset:0;z-index:1}
  .has-background-dim-10{opacity:.1}.has-background-dim-50{opacity:.5}
  .has-background-dim-55{opacity:.55}.has-background-dim-60{opacity:.6}.has-background-dim-70{opacity:.7}
  .has-black-background-color{background:#000}.has-white-background-color{background:#fff}
  .wp-block-cover__image-background{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover}
  .wp-block-cover__inner-container{position:relative;z-index:2;width:100%;max-width:1100px;margin:0 auto}
  .is-position-center-left{align-items:center;justify-content:flex-start}
  .is-position-center-center{align-items:center;justify-content:center}
  .is-position-bottom-left{align-items:flex-end;justify-content:flex-start}
  .wp-block-group{width:100%}
  .wp-block-group.is-layout-flex{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end}
  .is-content-justification-center{justify-content:center}
  .is-content-justification-space-between{justify-content:space-between}
  .wp-block-group.is-nowrap{flex-wrap:nowrap}
  .is-nowrap>p:first-child{flex:1;min-width:0}
  .is-nowrap>p:last-child{flex:none;white-space:nowrap}
  .wp-block-group.is-layout-flex>p{margin-bottom:0}
  .wp-block-columns{display:flex;gap:1.5rem;align-items:stretch;max-width:100%}
  .wp-block-column{flex:1;min-width:0}
  .are-vertically-aligned-center .wp-block-column{align-self:center}
  .wp-block-image{margin:0} .wp-block-image img{width:100%;height:auto;display:block}
  .wp-block-buttons{display:flex;gap:1rem;flex-wrap:wrap}
  .wp-element-button{display:inline-block;text-decoration:none}
  .is-style-outline .wp-element-button{border-style:solid;background:transparent}
  .has-text-align-center{text-align:center}
  .wp-block-separator{border:0;height:1px;opacity:.6}
  .wp-block-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:0}
  .wp-block-gallery .wp-block-image img{aspect-ratio:1/1;object-fit:cover}
  @media (max-width:781px){ .wp-block-columns{flex-direction:column} .wp-block-gallery{grid-template-columns:repeat(2,1fr)} }
</style></head><body>
`;

function sobrat(vhod, vyhod, zagolovok, prefiksKartinok) {
  let s = readFileSync(vhod, 'utf8');
  s = s.replace(/<!-- \/?wp:[\s\S]*?-->/g, '');
  for (const [metka, fajl] of Object.entries(KARTINKI)) {
    s = s.split(metka).join(`${prefiksKartinok}${fajl}`);
  }
  // Ссылки между страницами в предпросмотре ведут на соседний файл.
  s = s.split('ЗАМЕНИТЬ-ССЫЛКУ-НА-МЕНЮ').join('2-menyu-predprosmotr.html');
  s = s.split('ЗАМЕНИТЬ-ССЫЛКУ-НА-ГЛАВНУЮ').join('1-glavnaya-predprosmotr.html');
  writeFileSync(vyhod, STILI.replace('ЗАГОЛОВОК', zagolovok) + s + '</body></html>');
  console.log(`  ${vyhod}`);
}

console.log('Предпросмотр собран:');
sobrat('wordpress/1-glavnaya.html', 'wordpress/1-glavnaya-predprosmotr.html', 'Кафе «Милк» — главная', 'kartinki/');
sobrat('wordpress/2-menyu.html', 'wordpress/2-menyu-predprosmotr.html', 'Кафе «Милк» — меню', 'kartinki/');
