// Движение на главной: появление при прокрутке, параллакс дудлов и фото,
// встречные полосы галереи.
//
// prefers-reduced-motion отключает всё целиком — это требование доступности,
// а не пожелание. Параллакс выключается и на ширине меньше 768 px.

const bezDvizheniya = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const uzkiyEkran = () => window.matchMedia('(max-width: 767px)').matches;

/** Появление при прокрутке: сдвиг снизу и проявление, один раз. */
function poyavlenie() {
  const elementy = [...document.querySelectorAll<HTMLElement>('[data-poyavlenie]')];
  if (!elementy.length) return;
  if (bezDvizheniya()) {
    elementy.forEach((el) => el.classList.add('vidno'));
    return;
  }
  const nablyudatel = new IntersectionObserver((zapisi) => {
    for (const zapis of zapisi) {
      if (!zapis.isIntersecting) continue;
      const el = zapis.target as HTMLElement;
      el.classList.add('vidno');
      nablyudatel.unobserve(el);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  elementy.forEach((el) => nablyudatel.observe(el));
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
