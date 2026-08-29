// Общее поведение выезжающих сверху слоёв: панели «Заказать» и мобильного
// меню. Кривая, длительность, ловушка фокуса и блокировка прокрутки заданы
// в одном месте — иначе при первой же правке слои разъедутся.

const FOKUSIRUEMYE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

let otkrytaya: HTMLElement | null = null;
// Кнопка, которая открыла слой: кнопок «Заказать» на странице несколько —
// в шапке, в карточках сетов, в блоке банкетов, — и фокус должен вернуться
// именно на ту, которую нажали.
let vernutFokusNa: HTMLElement | null = null;

/**
 * Блокирует прокрутку страницы, компенсируя ширину полосы прокрутки.
 * Без компенсации страница дёргается вбок в тот момент, когда полоса исчезает.
 */
function zablokirovatProkrutku() {
  const polosa = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--polosa-prokrutki', `${polosa}px`);
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${polosa}px`;
}

function razblokirovatProkrutku() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.setProperty('--polosa-prokrutki', '0px');
}

function vnutriFokusiruemye(sloy: HTMLElement): HTMLElement[] {
  return [...sloy.querySelectorAll<HTMLElement>(FOKUSIRUEMYE)]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function derzhatFokus(sobytie: KeyboardEvent) {
  if (!otkrytaya || sobytie.key !== 'Tab') return;
  const elementy = vnutriFokusiruemye(otkrytaya);
  if (!elementy.length) return;
  const pervyy = elementy[0];
  const posledniy = elementy[elementy.length - 1];
  if (sobytie.shiftKey && document.activeElement === pervyy) {
    sobytie.preventDefault();
    posledniy.focus();
  } else if (!sobytie.shiftKey && document.activeElement === posledniy) {
    sobytie.preventDefault();
    pervyy.focus();
  }
}

function poKlavishe(sobytie: KeyboardEvent) {
  if (sobytie.key === 'Escape') zakryt();
  else derzhatFokus(sobytie);
}

export function otkryt(imya: string, istochnik?: HTMLElement) {
  const sloy = document.querySelector<HTMLElement>(`[data-vydvizhnaya="${imya}"]`);
  if (!sloy || otkrytaya === sloy) return;
  if (otkrytaya) zakryt();

  vernutFokusNa = istochnik ?? (document.activeElement as HTMLElement | null);
  otkrytaya = sloy;

  zablokirovatProkrutku();
  sloy.hidden = false;
  // Кадр между снятием hidden и классом нужен, чтобы переход проиграл.
  requestAnimationFrame(() => sloy.classList.add('vydvizhnaya--otkryta'));

  vnutriFokusiruemye(sloy)[0]?.focus();
  document.addEventListener('keydown', poKlavishe);
}

export function zakryt() {
  const sloy = otkrytaya;
  if (!sloy) return;
  otkrytaya = null;
  document.removeEventListener('keydown', poKlavishe);
  razblokirovatProkrutku();
  sloy.classList.remove('vydvizhnaya--otkryta');

  const spryatat = () => { sloy.hidden = true; };
  const dvizhenieOtklyucheno = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (dvizhenieOtklyucheno) spryatat();
  else sloy.addEventListener('transitionend', spryatat, { once: true });

  vernutFokusNa?.focus();
  vernutFokusNa = null;
}

export function nastroit() {
  document.addEventListener('click', (sobytie) => {
    const cel = sobytie.target as HTMLElement;

    const knopka = cel.closest<HTMLElement>('[data-otkryt]');
    if (knopka) {
      sobytie.preventDefault();
      const imya = knopka.dataset.otkryt!;
      // Панель умеет менять заголовок и текст под кнопку, которая её открыла,
      // и показывать строку «Вы смотрели», когда открыта с карточки блюда.
      nastroitSoderzhimoe(imya, knopka.dataset);
      otkryt(imya, knopka);
      return;
    }

    if (cel.closest('[data-zakryt]') || cel.hasAttribute('data-zatemnenie')) zakryt();
  });
}

function nastroitSoderzhimoe(imya: string, dannye: DOMStringMap) {
  const sloy = document.querySelector<HTMLElement>(`[data-vydvizhnaya="${imya}"]`);
  if (!sloy) return;

  const zagolovok = sloy.querySelector<HTMLElement>('[data-pole="zagolovok"]');
  const tekst = sloy.querySelector<HTMLElement>('[data-pole="tekst"]');
  if (zagolovok) zagolovok.textContent = dannye.zagolovok || zagolovok.dataset.poumolchaniyu || zagolovok.textContent;
  if (tekst) tekst.textContent = dannye.tekst || tekst.dataset.poumolchaniyu || tekst.textContent;

  const kontekst = sloy.querySelector<HTMLElement>('[data-pole="kontekst"]');
  if (kontekst) {
    const nazvanie = dannye.kontekst;
    kontekst.hidden = !nazvanie;
    if (nazvanie) kontekst.textContent = `Вы смотрели: ${nazvanie}`;
  }
}
