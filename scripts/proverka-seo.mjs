// Сводная проверка SEO и доступности по ключевым страницам.
// Запуск: node scripts/proverka-seo.mjs [адрес]
import { otkrytBrauzer } from './brauzer.mjs';

const BAZA = process.argv[2] ?? 'http://localhost:4321/Milk-site';
const STRANICY = ['/', '/menu', '/menu/shakshuka', '/menu/set-hit-n1', '/404'];

const brauzer = await otkrytBrauzer();
const p = await brauzer.newPage({ viewport: { width: 1280, height: 900 } });
await p.route('**://fonts.g**', (r) => r.abort());

let oshibok = 0;
for (const put of STRANICY) {
  await p.goto(`${BAZA}${put}`, { waitUntil: 'load' });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content ?? '';
    const og = (n) => document.querySelector(`meta[property="og:${n}"]`)?.content ?? '';
    const zagolovki = [...document.querySelectorAll('h1, h2, h3, h4')].map((e) => Number(e.tagName[1]));
    let ierarhiya = true;
    for (let i = 1; i < zagolovki.length; i++) if (zagolovki[i] - zagolovki[i - 1] > 1) ierarhiya = false;
    return {
      title: document.title,
      opisanie: meta('description'),
      kanon: document.querySelector('link[rel="canonical"]')?.href ?? '',
      h1: document.querySelectorAll('h1').length,
      ierarhiya,
      ogTitle: !!og('title'), ogImage: !!og('image'),
      schema: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => JSON.parse(s.textContent)['@type']),
      bezAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      bezRazmerov: [...document.images].filter((i) => !i.width || !i.height).length,
      lazy: [...document.images].filter((i) => i.loading === 'lazy').length,
      vsegoKartinok: document.images.length,
      knopkiBezImeni: [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
    };
  });
  const bedy = [];
  if (r.h1 !== 1) bedy.push(`H1: ${r.h1}`);
  if (!r.ierarhiya) bedy.push('иерархия заголовков нарушена');
  if (r.opisanie.length > 160) bedy.push(`описание ${r.opisanie.length} знаков`);
  if (!r.opisanie) bedy.push('нет описания');
  if (!r.kanon) bedy.push('нет canonical');
  if (!r.ogTitle || !r.ogImage) bedy.push('неполный Open Graph');
  if (r.bezAlt) bedy.push(`без alt: ${r.bezAlt}`);
  if (r.bezRazmerov) bedy.push(`без width/height: ${r.bezRazmerov}`);
  if (r.knopkiBezImeni) bedy.push(`кнопок без имени: ${r.knopkiBezImeni}`);
  if (bedy.length) oshibok += bedy.length;

  console.log(`${put}`);
  console.log(`   «${r.title.slice(0, 70)}»`);
  console.log(`   описание ${r.opisanie.length} зн., H1 ${r.h1}, картинок ${r.vsegoKartinok} (отложенных ${r.lazy}), схема: ${r.schema.join(', ') || '—'}`);
  console.log(`   ${bedy.length ? '✗ ' + bedy.join('; ') : '✓ без замечаний'}`);
}

await brauzer.close();
console.log(oshibok ? `\nЗамечаний: ${oshibok}` : '\nSEO и доступность — без замечаний.');
