// Собирает две страницы для конструктора WordPress: ознакомительную и меню.
//
// Разметка — обычные блоки Гутенберга, без плагинов и своего кода: такая
// страница вставляется в редактор копипастом и работает на бесплатном плане.
// Цвета заданы прямо в блоках, поэтому вид не зависит от выбранной темы.
//
// Цены и составы берутся из menu.json и никогда не набираются руками.
//
// Запуск: node scripts/wordpress-stranicy.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { chitatMenu } from './lib-images.mjs';

const CVET = {
  milk: '#f8eee4', rose: '#f9e4da', ink: '#3d2b1c', muted: '#78644e',
  coffee: '#a18152', coffeeDeep: '#8a6f47', coffeeDark: '#5f3515',
  beige: '#e3cfac', orange: '#c85111', white: '#ffffff',
};

const cena = (n) => `${n}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Экранирование: составы приходят из данных и попадают в разметку. */
const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const json = (o) => JSON.stringify(o);

// ---- Кирпичики разметки -----------------------------------------------

function zagolovok(tekst, { uroven = 2, razmer = '2.2rem', cvet = CVET.ink, poCentru = false, nizhniyOtstup = '1.5rem' } = {}) {
  const atr = {
    level: uroven,
    ...(poCentru ? { textAlign: 'center' } : {}),
    style: { typography: { fontSize: razmer, fontWeight: '700', lineHeight: '1.15' },
             color: { text: cvet }, spacing: { margin: { bottom: nizhniyOtstup } } },
  };
  const klassy = ['wp-block-heading', poCentru && 'has-text-align-center', 'has-text-color'].filter(Boolean).join(' ');
  return `<!-- wp:heading ${json(atr)} -->
<h${uroven} class="${klassy}" style="color:${cvet};margin-bottom:${nizhniyOtstup};font-size:${razmer};font-weight:700;line-height:1.15">${html(tekst)}</h${uroven}>
<!-- /wp:heading -->`;
}

function abzac(tekst, { cvet = CVET.ink, razmer = null, ves = null, poCentru = false, nizhniyOtstup = '1rem', vysotaStroki = '1.6' } = {}) {
  const stil = { color: { text: cvet }, typography: { lineHeight: vysotaStroki,
    ...(razmer ? { fontSize: razmer } : {}), ...(ves ? { fontWeight: ves } : {}) },
    spacing: { margin: { bottom: nizhniyOtstup } } };
  const atr = { ...(poCentru ? { align: 'center' } : {}), style: stil };
  const klassy = [poCentru && 'has-text-align-center', 'has-text-color'].filter(Boolean).join(' ');
  const css = [`color:${cvet}`, `margin-bottom:${nizhniyOtstup}`, razmer && `font-size:${razmer}`,
    ves && `font-weight:${ves}`, `line-height:${vysotaStroki}`].filter(Boolean).join(';');
  return `<!-- wp:paragraph ${json(atr)} -->
<p class="${klassy}" style="${css}">${tekst}</p>
<!-- /wp:paragraph -->`;
}

function knopka(nadpis, adres, { vid = 'glavnaya' } = {}) {
  const zalivka = vid === 'glavnaya' ? CVET.orange : 'transparent';
  const tekst = vid === 'glavnaya' ? CVET.white : CVET.ink;
  const stil = {
    color: { ...(vid === 'glavnaya' ? { background: CVET.orange, text: CVET.white } : { text: CVET.ink }) },
    border: { radius: '999px', ...(vid === 'glavnaya' ? {} : { width: '1px', color: CVET.coffee }) },
    spacing: { padding: { top: '0.9rem', bottom: '0.9rem', left: '1.8rem', right: '1.8rem' } },
    typography: { fontWeight: '600' },
  };
  const atr = { ...(vid === 'glavnaya' ? {} : { className: 'is-style-outline' }), style: stil };
  const klassy = ['wp-block-button', vid !== 'glavnaya' && 'is-style-outline'].filter(Boolean).join(' ');
  const css = [vid !== 'glavnaya' && `border-color:${CVET.coffee};border-width:1px`, 'border-radius:999px',
    `color:${tekst}`, vid === 'glavnaya' && `background-color:${zalivka}`,
    'padding-top:0.9rem;padding-right:1.8rem;padding-bottom:0.9rem;padding-left:1.8rem', 'font-weight:600']
    .filter(Boolean).join(';');
  const klassySsylki = ['wp-block-button__link', 'has-text-color', vid === 'glavnaya' && 'has-background',
    vid !== 'glavnaya' && 'has-border-color', 'wp-element-button'].filter(Boolean).join(' ');
  return `<!-- wp:button ${json(atr)} -->
<div class="${klassy}"><a class="${klassySsylki}" href="${adres}" style="${css}">${html(nadpis)}</a></div>
<!-- /wp:button -->`;
}

function knopki(spisok, { poCentru = false } = {}) {
  const atr = poCentru ? { layout: { type: 'flex', justifyContent: 'center' } } : {};
  const klassy = ['wp-block-buttons', poCentru && 'is-content-justification-center is-layout-flex wp-block-buttons-is-layout-flex']
    .filter(Boolean).join(' ');
  return `<!-- wp:buttons ${json(atr)} -->
<div class="${klassy}">${spisok.join('\n\n')}</div>
<!-- /wp:buttons -->`;
}

function gruppa(soderzhimoe, { fon = null, otstupY = '5rem', shirina = '1100px', yakor = null } = {}) {
  const stil = { ...(fon ? { color: { background: fon } } : {}),
    spacing: { padding: { top: otstupY, bottom: otstupY, left: '1.5rem', right: '1.5rem' } } };
  const atr = { ...(yakor ? { anchor: yakor } : {}), style: stil,
    layout: { type: 'constrained', contentSize: shirina } };
  const klassy = ['wp-block-group', fon && 'has-background'].filter(Boolean).join(' ');
  const css = [fon && `background-color:${fon}`,
    `padding-top:${otstupY};padding-right:1.5rem;padding-bottom:${otstupY};padding-left:1.5rem`].filter(Boolean).join(';');
  return `<!-- wp:group ${json(atr)} -->
<div class="${klassy}"${yakor ? ` id="${yakor}"` : ''} style="${css}">${soderzhimoe.join('\n\n')}</div>
<!-- /wp:group -->`;
}

function kolonki(spisok, { promezhutok = '1.5rem', poVertikaliCentr = false } = {}) {
  const atr = { ...(poVertikaliCentr ? { verticalAlignment: 'center' } : {}),
    style: { spacing: { blockGap: { left: promezhutok } } } };
  const klassy = ['wp-block-columns', poVertikaliCentr && 'are-vertically-aligned-center'].filter(Boolean).join(' ');
  return `<!-- wp:columns ${json(atr)} -->
<div class="${klassy}">${spisok.join('\n\n')}</div>
<!-- /wp:columns -->`;
}

function kolonka(soderzhimoe, { shirina = null, fon = null, skruglenie = null, otstup = null, poVertikaliCentr = false } = {}) {
  const stil = { ...(fon ? { color: { background: fon } } : {}),
    ...(skruglenie ? { border: { radius: skruglenie } } : {}),
    ...(otstup ? { spacing: { padding: { top: otstup, bottom: otstup, left: otstup, right: otstup } } } : {}) };
  const atr = { ...(poVertikaliCentr ? { verticalAlignment: 'center' } : {}),
    ...(shirina ? { width: shirina } : {}), ...(Object.keys(stil).length ? { style: stil } : {}) };
  const klassy = ['wp-block-column', poVertikaliCentr && 'is-vertically-aligned-center', fon && 'has-background']
    .filter(Boolean).join(' ');
  const css = [shirina && `flex-basis:${shirina}`, skruglenie && `border-radius:${skruglenie}`,
    fon && `background-color:${fon}`,
    otstup && `padding-top:${otstup};padding-right:${otstup};padding-bottom:${otstup};padding-left:${otstup}`]
    .filter(Boolean).join(';');
  return `<!-- wp:column ${json(atr)} -->
<div class="${klassy}"${css ? ` style="${css}"` : ''}>${soderzhimoe.join('\n\n')}</div>
<!-- /wp:column -->`;
}

function kartinka(metka, alt, { skruglenie = '18px' } = {}) {
  const atr = { sizeSlug: 'large', style: { border: { radius: skruglenie } } };
  return `<!-- wp:image ${json(atr)} -->
<figure class="wp-block-image size-large has-custom-border"><img src="${metka}" alt="${html(alt)}" style="border-radius:${skruglenie}"/></figure>
<!-- /wp:image -->`;
}

function razdelitel(cvet = CVET.beige) {
  return `<!-- wp:separator {"backgroundColor":"","style":{"color":{"background":"${cvet}"},"spacing":{"margin":{"top":"1rem","bottom":"1rem"}}}} -->
<hr class="wp-block-separator has-text-color has-alpha-channel-opacity has-background" style="background-color:${cvet};color:${cvet};margin-top:1rem;margin-bottom:1rem"/>
<!-- /wp:separator -->`;
}

function otstup(vysota = '2rem') {
  return `<!-- wp:spacer {"height":"${vysota}"} -->
<div style="height:${vysota}" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->`;
}

export { CVET, cena, html, zagolovok, abzac, knopka, knopki, gruppa, kolonki, kolonka, kartinka, razdelitel, otstup, chitatMenu, writeFileSync, mkdirSync };
