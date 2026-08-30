// Фильтрация каталога, поиск и синхронизация с адресной строкой.
//
// Все 91 карточка выводятся в разметку при сборке — поисковики видят их
// целиком, а фильтр только показывает и прячет. Перезагрузки не происходит.

const PARAMETR = 'cat';

/** Приводит строку к виду, в котором сравнивается поиск: без регистра и ё. */
export function normalizovat(stroka: string): string {
  return stroka.toLowerCase().replace(/ё/g, 'е');
}

// Сколько первых букв должно совпасть, чтобы слова считались одним.
// Точное вхождение подстроки не годится: «креветка» не нашла бы
// «Креветки, кальмары, мидии», а «лосось» — «омлет с лососем».
const OSNOVA = 4;

const slova = (stroka: string) => normalizovat(stroka).split(/[^a-zа-я0-9]+/).filter(Boolean);

function odnoSlovo(izTeksta: string, izZaprosa: string): boolean {
  const nuzhno = Math.min(izZaprosa.length, OSNOVA);
  if (izTeksta.length < nuzhno) return false;
  for (let i = 0; i < nuzhno; i++) if (izTeksta[i] !== izZaprosa[i]) return false;
  return true;
}

/** Каждое слово запроса должно найтись в тексте — иначе это не совпадение. */
export function podhodit(slovaTeksta: string[], zapros: string): boolean {
  const iskomye = slova(zapros);
  if (!iskomye.length) return true;
  return iskomye.every((z) => slovaTeksta.some((t) => odnoSlovo(t, z)));
}

declare global {
  interface HTMLElement { __slova?: string[]; }
}

interface Uzly {
  koren: HTMLElement;
  knopki: HTMLElement[];
  lenta: HTMLElement;
  gruppy: HTMLElement[];
  kartochki: HTMLElement[];
  pole: HTMLInputElement;
  pusto: HTMLElement;
  schetchik: HTMLElement | null;
}

let u: Uzly;
let vybrannye: string[] = [];

function izAdresa(): string[] {
  const znachenie = new URLSearchParams(location.search).get(PARAMETR);
  if (!znachenie) return [];
  const sushchestvuyushchie = new Set(u.knopki.map((k) => k.dataset.kategoriya!));
  return znachenie.split(',').map((s) => s.trim()).filter((s) => sushchestvuyushchie.has(s));
}

function vAdres(zamenit = false) {
  const adres = new URL(location.href);
  if (vybrannye.length) adres.searchParams.set(PARAMETR, vybrannye.join(','));
  else adres.searchParams.delete(PARAMETR);
  // Кнопка «назад» должна возвращать предыдущий выбор, а не предыдущую страницу.
  history[zamenit ? 'replaceState' : 'pushState']({ kategorii: vybrannye }, '', adres);
}

function primenit() {
  const vybor = new Set(vybrannye);
  let vsego = 0;

  for (const kartochka of u.kartochki) {
    const poKategorii = !vybor.size || vybor.has(kartochka.dataset.kategoriya!);
    const poPoisku = podhodit(kartochka.__slova!, u.pole.value);
    const vidna = poKategorii && poPoisku;
    kartochka.hidden = !vidna;
    if (vidna) vsego++;
  }

  // Заголовок группы нужен, когда категорий больше одной: при выборе
  // единственной он дублировал бы активную кнопку.
  const pokazatZagolovki = vybrannye.length !== 1;
  for (const gruppa of u.gruppy) {
    const est = [...gruppa.querySelectorAll<HTMLElement>('[data-blyudo]')].some((k) => !k.hidden);
    gruppa.hidden = !est;
    const zagolovok = gruppa.querySelector<HTMLElement>('[data-zagolovok-gruppy]');
    if (zagolovok) zagolovok.hidden = !pokazatZagolovki;
  }

  u.pusto.hidden = vsego > 0;
  if (u.schetchik) {
    u.schetchik.textContent = vsego === 0 ? 'ничего не нашлось' : `${vsego} ${sklonenie(vsego)}`;
  }

  for (const knopka of u.knopki) {
    const aktivna = vybor.has(knopka.dataset.kategoriya!);
    knopka.classList.toggle('kategorii__knopka--aktivna', aktivna);
    knopka.setAttribute('aria-pressed', String(aktivna));
  }
  const vse = u.koren.querySelector<HTMLElement>('[data-vse]');
  if (vse) {
    vse.classList.toggle('kategorii__knopka--aktivna', !vybor.size);
    vse.setAttribute('aria-pressed', String(!vybor.size));
  }
}

function sklonenie(n: number): string {
  const sotni = n % 100;
  if (sotni >= 11 && sotni <= 14) return 'позиций';
  const edinicy = n % 10;
  if (edinicy === 1) return 'позиция';
  if (edinicy >= 2 && edinicy <= 4) return 'позиции';
  return 'позиций';
}

/** Подкручивает ленту категорий к первой выбранной кнопке. */
function podkrutit() {
  const pervaya = vybrannye.length
    ? u.knopki.find((k) => k.dataset.kategoriya === vybrannye[0])
    : u.koren.querySelector<HTMLElement>('[data-vse]');
  if (!pervaya) return;
  const lenta = u.lenta.getBoundingClientRect();
  const knopka = pervaya.getBoundingClientRect();
  if (knopka.left < lenta.left || knopka.right > lenta.right) {
    u.lenta.scrollTo({
      left: u.lenta.scrollLeft + knopka.left - lenta.left - 16,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
}

export function nastroitKatalog() {
  const koren = document.querySelector<HTMLElement>('[data-katalog]');
  if (!koren) return;

  u = {
    koren,
    // Атрибут data-kategoriya есть и у ячеек сетки, поэтому кнопки
    // выбираются только внутри ленты — иначе класс активности попадал
    // и на карточки блюд.
    knopki: [...koren.querySelectorAll<HTMLElement>('[data-lenta] [data-kategoriya]')],
    lenta: koren.querySelector<HTMLElement>('[data-lenta]')!,
    gruppy: [...koren.querySelectorAll<HTMLElement>('[data-gruppa]')],
    kartochki: [...koren.querySelectorAll<HTMLElement>('[data-blyudo]')],
    pole: koren.querySelector<HTMLInputElement>('[data-poisk]')!,
    pusto: koren.querySelector<HTMLElement>('[data-pusto]')!,
    schetchik: koren.querySelector<HTMLElement>('[data-schetchik]'),
  };

  // Слова карточки разбираются один раз: при каждом нажатии клавиши
  // перебираются 91 карточка, и разбор строки на лету заметно тормозил бы.
  for (const kartochka of u.kartochki) kartochka.__slova = slova(kartochka.dataset.poisk ?? '');

  vybrannye = izAdresa();
  primenit();
  podkrutit();
  vAdres(true);

  koren.addEventListener('click', (sobytie) => {
    const knopka = (sobytie.target as HTMLElement).closest<HTMLElement>('[data-kategoriya], [data-vse], [data-sbros]');
    if (!knopka) return;
    if (knopka.hasAttribute('data-kategoriya')) {
      // Одна кнопка — одна категория: наборы приходят только по ссылке с главной.
      vybrannye = [knopka.dataset.kategoriya!];
    } else {
      vybrannye = [];
      if (knopka.hasAttribute('data-sbros')) u.pole.value = '';
    }
    vAdres();
    primenit();
    podkrutit();
  });

  u.pole.addEventListener('input', primenit);

  // Кнопки «назад» и «вперёд» возвращают предыдущий выбор категорий.
  window.addEventListener('popstate', () => {
    vybrannye = izAdresa();
    primenit();
    podkrutit();
  });
}
