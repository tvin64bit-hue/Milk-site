// Движение на главной: появление при прокрутке, параллакс дудлов и фото,
// встречные полосы галереи.
//
// prefers-reduced-motion отключает всё целиком — это требование доступности,
// а не пожелание. Параллакс выключается и на ширине меньше 768 px.

const bezDvizheniya = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const uzkiyEkran = () => window.matchMedia('(max-width: 767px)').matches;

/** Ближайший предок, который прокручивается вбок и потому обрезает потомков. */
function lentaNad(element: HTMLElement): HTMLElement | null {
  for (let p = element.parentElement; p && p !== document.body; p = p.parentElement) {
    const os = getComputedStyle(p).overflowX;
    if (os === 'auto' || os === 'scroll') return p;
  }
  return null;
}

/** Появление при прокрутке: сдвиг снизу и проявление, один раз. */
function poyavlenie() {
  const elementy = [...document.querySelectorAll<HTMLElement>('[data-poyavlenie]')];
  if (!elementy.length) return;
  if (bezDvizheniya()) {
    elementy.forEach((el) => el.classList.add('vidno'));
    return;
  }

  // Элемент, уехавший за край прокручиваемой ленты, с экраном не
  // пересекается: предок его обрезает, и наблюдатель о нём не узнает
  // никогда — сколько страницу вниз ни листай. Поэтому за такими следим
  // не поодиночке, а через саму ленту: она в кадре — проявляется вся
  // группа разом. Без этого на телефоне в ленте завтраков две карточки
  // из четырёх оставались пустыми, и увидеть их можно было только
  // пролистав ленту вбок.
  const gruppy = new Map<HTMLElement, HTMLElement[]>();
  const otdelnye: HTMLElement[] = [];
  for (const el of elementy) {
    const lenta = lentaNad(el);
    if (!lenta) { otdelnye.push(el); continue; }
    const svoi = gruppy.get(lenta);
    if (svoi) { svoi.push(el); } else { gruppy.set(lenta, [el]); }
  }

  const nablyudatel = new IntersectionObserver((zapisi) => {
    for (const zapis of zapisi) {
      if (!zapis.isIntersecting) continue;
      const cel = zapis.target as HTMLElement;
      const gruppa = gruppy.get(cel);
      if (gruppa) { gruppa.forEach((el) => el.classList.add('vidno')); } else { cel.classList.add('vidno'); }
      nablyudatel.unobserve(cel);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  otdelnye.forEach((el) => nablyudatel.observe(el));
  gruppy.forEach((_, lenta) => nablyudatel.observe(lenta));
}

/**
 * Параллакс дудлов, фото первого экрана и полос галереи.
 * Слои двигаются в одном обработчике на requestAnimationFrame — отдельные
 * обработчики прокрутки на каждый элемент дают рывки.
 */
function parallaks() {
  if (bezDvizheniya() || uzkiyEkran()) return;
  const sloi = [...document.querySelectorAll<HTMLElement>('[data-parallaks]')];
  if (!sloi.length) return;

  let zaprosheno = false;
  const obnovit = () => {
    zaprosheno = false;
    const seredina = window.innerHeight / 2;
    for (const sloy of sloi) {
      const koeff = Number(sloy.dataset.parallaks) || 0.2;
      const gorizontal = sloy.dataset.parallaksOs === 'x';
      const kadr = sloy.getBoundingClientRect();
      // Ноль смещения там, где элемент по центру экрана. Размах ограничен:
      // на длинной странице множитель уводил дудлы на полторы тысячи пикселей.
      const predel = Number(sloy.dataset.parallaksPredel) || 90;
      const ot = (kadr.top + kadr.height / 2 - seredina) * koeff;
      const sdvig = Math.max(-predel, Math.min(predel, ot));
      sloy.style.transform = gorizontal
        ? `translate3d(${-sdvig}px, 0, 0)`
        : `translate3d(0, ${-sdvig}px, 0)`;
    }
  };

  window.addEventListener('scroll', () => {
    if (zaprosheno) return;
    zaprosheno = true;
    requestAnimationFrame(obnovit);
  }, { passive: true });
  window.addEventListener('resize', obnovit, { passive: true });
  obnovit();
}

export function nastroitDvizhenie() {
  poyavlenie();
  parallaks();
}
