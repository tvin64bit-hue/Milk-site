// Сборка двух страниц для WordPress. Кирпичики разметки — в wordpress-stranicy.mjs.
//
// Запуск: node scripts/wordpress-sobrat.mjs
import {
  CVET, cena, html, zagolovok, abzac, knopka, knopki, gruppa, kolonki, kolonka,
  kartinka, razdelitel, otstup, chitatMenu, writeFileSync, mkdirSync,
} from './wordpress-stranicy.mjs';

const menu = chitatMenu();
const poId = Object.fromEntries(menu.items.map((it) => [it.id, it]));
const kategorii = Object.fromEntries(menu.categories.map((k) => [k.id, k.name]));

// Пометки вместо адресов картинок: подставляются после загрузки в медиатеку.
const M = (imya) => `ЗАМЕНИТЬ-${imya}`;

/** Обложка с фотографией и текстом поверх. */
function oblozhka(soderzhimoe, { metka, zatemnenie = 50, cvetZalivki = 'black', vysota = '78vh', poziciya = 'center center' }) {
  const atr = { url: metka, dimRatio: zatemnenie, overlayColor: cvetZalivki, minHeight: parseFloat(vysota),
    minHeightUnit: vysota.replace(/[\d.]/g, ''), contentPosition: poziciya,
    style: { spacing: { padding: { top: '3rem', bottom: '3rem', left: '2rem', right: '2rem' } } } };
  const klassPozicii = `is-position-${poziciya.replace(/\s+/g, '-')}`;
  return `<!-- wp:cover ${JSON.stringify(atr)} -->
<div class="wp-block-cover has-custom-content-position ${klassPozicii}" style="padding-top:3rem;padding-right:2rem;padding-bottom:3rem;padding-left:2rem;min-height:${vysota}"><span aria-hidden="true" class="wp-block-cover__background has-${cvetZalivki}-background-color has-background-dim-${zatemnenie} has-background-dim"></span><img class="wp-block-cover__image-background" src="${metka}" data-object-fit="cover"/><div class="wp-block-cover__inner-container is-layout-flow wp-block-cover-is-layout-flow">${soderzhimoe.join('\n\n')}</div></div>
<!-- /wp:cover -->`;
}

/** Плитка направления кухни: фото фоном, кофейная заливка, подпись поверх. */
function plitka({ metka, nazvanie, kolichestvo, podpis }) {
  return oblozhka([
    abzac(html(kolichestvo), { cvet: CVET.beige, razmer: '0.85rem', ves: '600', nizhniyOtstup: '0.4rem' }),
    zagolovok(nazvanie, { uroven: 3, razmer: '1.6rem', cvet: CVET.white, nizhniyOtstup: '0.5rem' }),
    abzac(html(podpis), { cvet: CVET.milk, razmer: '0.95rem', nizhniyOtstup: '0' }),
  ], { metka, zatemnenie: 50, cvetZalivki: 'black', vysota: '260px', poziciya: 'bottom left' });
}

/** Карточка блюда для подборки на главной. */
function kartochka(id, metka, { hit = false } = {}) {
  const b = poId[id];
  const vnutri = [kartinka(metka, b.name)];
  if (hit) {
    vnutri.push(`<!-- wp:paragraph {"style":{"color":{"background":"${CVET.orange}","text":"${CVET.white}"},"border":{"radius":"12px"},"typography":{"fontSize":"0.72rem","fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.06em"},"spacing":{"padding":{"top":"0.3rem","bottom":"0.3rem","left":"0.7rem","right":"0.7rem"},"margin":{"top":"0.75rem","bottom":"0.4rem"}}}} -->
<p class="has-text-color has-background" style="border-radius:12px;color:${CVET.white};background-color:${CVET.orange};margin-top:0.75rem;margin-bottom:0.4rem;padding:0.3rem 0.7rem;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">хит</p>
<!-- /wp:paragraph -->`);
  }
  vnutri.push(zagolovok(b.name, { uroven: 3, razmer: '1.15rem', nizhniyOtstup: '0.5rem' }));
  vnutri.push(abzac(html(b.description), { cvet: CVET.muted, razmer: '0.9rem', vysotaStroki: '1.45', nizhniyOtstup: '0.75rem' }));
  vnutri.push(abzac(html(b.weight), { cvet: CVET.muted, razmer: '0.85rem', nizhniyOtstup: '0.5rem' }));
  if (b.oldPrice) vnutri.push(abzac(`<s>${cena(b.oldPrice)} ₽</s>`, { cvet: CVET.muted, razmer: '0.95rem', nizhniyOtstup: '0.2rem' }));
  vnutri.push(abzac(`${cena(b.price)} ₽`, { cvet: CVET.orange, razmer: '1.5rem', ves: '700', nizhniyOtstup: '0' }));
  return kolonka(vnutri, { fon: CVET.white, skruglenie: '24px', otstup: '1rem' });
}

/** Строка меню: название и цена по краям, состав под ними. */
function strokaMenyu(b) {
  // nowrap: при переносе цена уезжала под название и вставала слева —
  // на узком экране это читалось как отдельная строка, а не как цена блюда.
  const stroka = `<!-- wp:group {"style":{"spacing":{"blockGap":"1rem","margin":{"bottom":"0.25rem"}}},"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between","verticalAlignment":"bottom"}} -->
<div class="wp-block-group is-content-justification-space-between is-nowrap is-layout-flex wp-block-group-is-layout-flex" style="margin-bottom:0.25rem">${[
    abzac(html(b.name), { razmer: '1.05rem', ves: '600', nizhniyOtstup: '0' }),
    abzac(`${cena(b.price)} ₽`, { cvet: CVET.orange, razmer: '1.15rem', ves: '700', nizhniyOtstup: '0' }),
  ].join('\n\n')}</div>
<!-- /wp:group -->`;
  const opisanie = abzac(`${html(b.description)} <span style="color:${CVET.coffee}">· ${html(b.weight)}</span>`,
    { cvet: CVET.muted, razmer: '0.88rem', vysotaStroki: '1.45', nizhniyOtstup: '1.25rem' });
  return [stroka, opisanie].join('\n\n');
}

/** Раздел меню: две колонки позиций, разделённые тонкими линиями. */
function razdelMenyu(pozicii) {
  const polovina = Math.ceil(pozicii.length / 2);
  const stolbec = (chast) => kolonka(chast.flatMap((b, i) => (i ? [razdelitel(), strokaMenyu(b)] : [strokaMenyu(b)])));
  return kolonki([stolbec(pozicii.slice(0, polovina)), stolbec(pozicii.slice(polovina))], { promezhutok: '3rem' });
}

// ======================= Страница 1: ознакомительная =======================

const TELEFON = '+7 961 362-59-43';
const TEL_SSYLKA = 'tel:+79613625943';
const SSYLKA_MENYU = 'ЗАМЕНИТЬ-ССЫЛКУ-НА-МЕНЮ';

const pervyyEkran = oblozhka([
  `<!-- wp:group {"layout":{"type":"constrained","contentSize":"520px","justifyContent":"left"}} -->
<div class="wp-block-group">${[
    zagolovok('Место, где хорошо', { uroven: 1, razmer: '3.4rem', nizhniyOtstup: '1.5rem' }),
    abzac('Кафе «Милк» в центре Благовещенска. Завтраки, кофе от своих бариста, роллы, пицца и паста. Каждый день с 10:00 до 21:00.',
      { razmer: '1.15rem', nizhniyOtstup: '2rem' }),
    knopki([knopka('Смотреть меню', SSYLKA_MENYU), knopka('Заказать по телефону', TEL_SSYLKA, { vid: 'vtoraya' })]),
  ].join('\n\n')}</div>
<!-- /wp:group -->`,
], { metka: M('ФОН'), zatemnenie: 10, cvetZalivki: 'white', vysota: '78vh', poziciya: 'center left' });

// Лента категорий вместо бегущей строки: движение в конструкторе не сделать,
// но сама полоса держит ритм страницы и отделяет первый экран от текста.
const lenta = `<!-- wp:group {"style":{"color":{"background":"${CVET.coffee}"},"spacing":{"padding":{"top":"1.1rem","bottom":"1.1rem","left":"1rem","right":"1rem"},"blockGap":"2rem"}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"center"}} -->
<div class="wp-block-group has-background is-content-justification-center is-layout-flex wp-block-group-is-layout-flex" style="background-color:${CVET.coffee};padding-top:1.1rem;padding-right:1rem;padding-bottom:1.1rem;padding-left:1rem">${
  ['Завтраки', 'Роллы', 'Сеты', 'Пицца', 'Паста', 'Кофе', 'Десерты', 'Детское меню']
    .map((s) => abzac(s, { cvet: CVET.white, razmer: '1rem', ves: '600', nizhniyOtstup: '0' })).join('\n\n')
}</div>
<!-- /wp:group -->`;

const oKafe = gruppa([
  kolonki([
    kolonka([kartinka(M('ЗАЛ'), 'Зал кафе «Милк» с неоновой надписью «Место, где хорошо»', { skruglenie: '24px' })],
      { shirina: '44%', poVertikaliCentr: true }),
    kolonka([
      zagolovok('Милк — ваше место в сердце города'),
      abzac('Мы придумали «Милк» как место, куда можно прийти в любом настроении. Утром — сесть с ноутбуком и чашкой кофе за столик у окна. Днём — забежать на обед. Вечером — собраться компанией за большим столом с сетом роллов.', { vysotaStroki: '1.65' }),
      abzac('Здесь варят кофе из свежеобжаренных зёрен, пекут вафли и сырники, крутят роллы и готовят пиццу — всё на одной кухне. И здесь не торопят: можно сидеть с одной чашкой столько, сколько нужно.', { vysotaStroki: '1.65' }),
      abzac('На стене у нас светится «Место, где хорошо». Это не слоган, придуманный для вывески, — это то, зачем мы открывались.', { vysotaStroki: '1.65', nizhniyOtstup: '0' }),
    ], { poVertikaliCentr: true }),
  ], { promezhutok: '3rem', poVertikaliCentr: true }),
], { fon: CVET.rose });

const napravleniya = gruppa([
  zagolovok('Что у нас есть', { poCentru: true, nizhniyOtstup: '0.75rem' }),
  abzac('91 позиция в меню — от овсянки до сета на большую компанию.', { cvet: CVET.muted, poCentru: true, nizhniyOtstup: '3rem' }),
  kolonki([
    kolonka([plitka({ metka: M('ПЛИТКА-ЗАВТРАКИ'), nazvanie: 'Завтраки', kolichestvo: '15 позиций', podpis: 'Шакшука, вафли с яйцом пашот, сырники, блины' })]),
    kolonka([plitka({ metka: M('ПЛИТКА-РОЛЛЫ'), nazvanie: 'Роллы и сеты', kolichestvo: '35 позиций', podpis: 'Холодные, темпура, запечённые и 10 готовых сетов' })]),
  ]),
  otstup('1.5rem'),
  kolonki([
    kolonka([plitka({ metka: M('ПЛИТКА-ПИЦЦА'), nazvanie: 'Пицца и паста', kolichestvo: '10 позиций', podpis: 'Пицца 29–30 см и паста на любой вкус' })]),
    kolonka([plitka({ metka: M('ПЛИТКА-КОФЕ'), nazvanie: 'Кофе и напитки', kolichestvo: '17 позиций', podpis: 'Латте с сырной пенкой трёх вкусов' })]),
  ]),
], { fon: CVET.milk });

const podborka = gruppa([
  zagolovok('Попробуйте для начала', { poCentru: true, nizhniyOtstup: '0.75rem' }),
  abzac('Четыре позиции, с которых обычно начинают знакомство с «Милком».', { cvet: CVET.muted, poCentru: true, nizhniyOtstup: '3rem' }),
  kolonki([
    kartochka('shakshuka', M('ШАКШУКУ')),
    kartochka('set-hit-n1', M('СЕТ'), { hit: true }),
    kartochka('picca-pepperoni', M('ПИЦЦУ')),
    kartochka('latte-s-syrnoy-penkoy-lavanda', M('ЛАТТЕ')),
  ]),
  otstup('2.5rem'),
  knopki([knopka('Всё меню', SSYLKA_MENYU)], { poCentru: true }),
], { fon: CVET.rose });

const citata = gruppa([
  abzac('«Место, где хорошо»', { cvet: CVET.beige, razmer: '2.6rem', ves: '700', poCentru: true, nizhniyOtstup: '1rem' }),
  abzac('Это не слоган, придуманный для вывески, — это то, зачем мы открывались.', { cvet: CVET.milk, poCentru: true, nizhniyOtstup: '0' }),
], { fon: CVET.coffeeDark, otstupY: '4rem', shirina: '760px' });

const galereya = gruppa([
  zagolovok('У нас внутри', { poCentru: true, nizhniyOtstup: '2.5rem' }),
  `<!-- wp:gallery {"columns":3,"linkTo":"none","style":{"spacing":{"blockGap":{"left":"1rem","top":"1rem"}}}} -->
<figure class="wp-block-gallery has-nested-images columns-3 is-cropped wp-block-gallery-is-layout-flex wp-block-gallery-is-layout-flex">${
    [['ГАЛЕРЕЯ-1', 'Барная стойка с витриной десертов'],
     ['ГАЛЕРЕЯ-2', 'Неоновая надпись «Счастье пахнет кофе и тобой»'],
     ['ГАЛЕРЕЯ-3', 'Два стакана кофе с надписью LOVE на сырной пенке'],
     ['ГАЛЕРЕЯ-4', 'Стол с роллами, лимонадом и ромашками'],
     ['ГАЛЕРЕЯ-5', 'Десерт «Павлова» с клубникой'],
     ['ГАЛЕРЕЯ-6', 'Фотозона с хрустальными люстрами и цветами']]
      .map(([metka, alt]) => `<!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"18px"}}} -->
<figure class="wp-block-image size-large has-custom-border"><img src="${M(metka)}" alt="${html(alt)}" style="border-radius:18px"/></figure>
<!-- /wp:image -->`).join('\n\n')
  }</figure>
<!-- /wp:gallery -->`,
], { fon: CVET.milk });

const shagi = gruppa([
  zagolovok('Заказать просто', { poCentru: true, nizhniyOtstup: '3rem' }),
  kolonki([
    ['1', 'Выберите блюда', 'Откройте меню и решите, что хотите. Записывать не обязательно — назовёте по телефону.'],
    ['2', 'Позвоните нам', `${TELEFON}, ежедневно с 10:00 до 21:00. Примем заказ и скажем, когда всё будет готово.`],
    ['3', 'Заберите или дождитесь', 'Самовывоз — ул. Седова, 113/4. Или привезём по городу: при заказе от 1200 ₽ доставка бесплатная.'],
  ].map(([nomer, zag, tekst]) => kolonka([
    abzac(nomer, { cvet: CVET.beige, razmer: '3rem', ves: '700', vysotaStroki: '1', nizhniyOtstup: '0.5rem' }),
    zagolovok(zag, { uroven: 3, razmer: '1.2rem', nizhniyOtstup: '0.5rem' }),
    abzac(tekst, { cvet: CVET.muted, vysotaStroki: '1.55', nizhniyOtstup: '0' }),
  ])), { promezhutok: '2rem' }),
], { fon: CVET.rose, shirina: '1000px' });

const kontakty = gruppa([
  zagolovok('Заходите или звоните', { poCentru: true, razmer: '2rem', cvet: CVET.milk, nizhniyOtstup: '1.5rem' }),
  abzac(`<a href="${TEL_SSYLKA}" style="color:${CVET.white};text-decoration:none">${TELEFON}</a>`,
    { cvet: CVET.white, razmer: '2.4rem', ves: '700', poCentru: true, nizhniyOtstup: '1.5rem' }),
  abzac('Благовещенск, ул. Седова, 113/4<br>Ежедневно с 10:00 до 21:00<br>Доставка по Благовещенску. От 1200 ₽ — бесплатно.',
    { cvet: CVET.beige, vysotaStroki: '1.8', poCentru: true, nizhniyOtstup: '2rem' }),
  knopki([knopka('Позвонить', TEL_SSYLKA)], { poCentru: true }),
], { fon: CVET.coffeeDark, otstupY: '4.5rem', shirina: '800px' });

const stranica1 = [pervyyEkran, lenta, oKafe, napravleniya, podborka, citata, galereya, shagi, kontakty].join('\n\n');

// ============================ Страница 2: меню ============================

const rolly = menu.items.filter((it) => it.category.startsWith('rolly-') && it.category !== 'detskie-rolly');
const picca = menu.items.filter((it) => it.category === 'picca');

const shapkaMenyu = gruppa([
  zagolovok('Меню', { uroven: 1, razmer: '3rem', poCentru: true, nizhniyOtstup: '1rem' }),
  abzac('Роллы и пицца — две главные категории. Заказ по телефону, доставка по городу и самовывоз.',
    { cvet: CVET.muted, poCentru: true, nizhniyOtstup: '2rem' }),
  knopki([knopka('Позвонить и заказать', TEL_SSYLKA)], { poCentru: true }),
], { fon: CVET.milk, otstupY: '4rem', shirina: '760px' });

function razdel({ metka, nazvanie, podpis, pozicii, fon }) {
  return [
    oblozhka([
      zagolovok(nazvanie, { uroven: 2, razmer: '2.6rem', cvet: CVET.white, poCentru: true, nizhniyOtstup: '0.5rem' }),
      abzac(`${podpis} · ${pozicii.length} позиций`, { cvet: CVET.milk, poCentru: true, nizhniyOtstup: '0' }),
    ], { metka, zatemnenie: 50, cvetZalivki: 'black', vysota: '280px', poziciya: 'center center' }),
    gruppa([razdelMenyu(pozicii)], { fon, otstupY: '3.5rem' }),
  ].join('\n\n');
}

const stranica2 = [
  shapkaMenyu,
  razdel({ metka: M('ОБЛОЖКА-РОЛЛЫ'), nazvanie: 'Роллы', podpis: 'Холодные, темпура и запечённые', pozicii: rolly, fon: CVET.milk }),
  razdel({ metka: M('ОБЛОЖКА-ПИЦЦА'), nazvanie: 'Пицца', podpis: '29–30 см, на тонком тесте', pozicii: picca, fon: CVET.rose }),
  gruppa([
    abzac('Заказ принимаем по телефону — так быстрее и точнее любой формы.', { cvet: CVET.milk, poCentru: true, nizhniyOtstup: '1rem' }),
    abzac(`<a href="${TEL_SSYLKA}" style="color:${CVET.white};text-decoration:none">${TELEFON}</a>`,
      { cvet: CVET.white, razmer: '2.2rem', ves: '700', poCentru: true, nizhniyOtstup: '1.5rem' }),
    knopki([knopka('На главную', 'ЗАМЕНИТЬ-ССЫЛКУ-НА-ГЛАВНУЮ', { vid: 'glavnaya' })], { poCentru: true }),
  ], { fon: CVET.coffeeDark, otstupY: '4rem', shirina: '760px' }),
].join('\n\n');

mkdirSync('wordpress', { recursive: true });
writeFileSync('wordpress/1-glavnaya.html', stranica1 + '\n');
writeFileSync('wordpress/2-menyu.html', stranica2 + '\n');

console.log(`Страница 1 «Ознакомительная»: ${(stranica1.length / 1024).toFixed(0)} КБ, секций 9`);
console.log(`Страница 2 «Меню»: ${(stranica2.length / 1024).toFixed(0)} КБ, роллов ${rolly.length}, пицц ${picca.length}`);
