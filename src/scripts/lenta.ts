// Горизонтальные ленты: прокрутка стрелками и колесом мыши.
//
// Пальцем лента листается сама, но мышью — нет: колесо крутит страницу, а
// не ленту, и о том, что справа есть продолжение, ничто не сообщает.
// Поэтому по краям появляются стрелки и затухание, и оба признака
// показываются только с той стороны, куда действительно есть куда ехать.

const ZAPAS = 2; // допуск на дробные пиксели при сравнении координат

function nastroit(obolochka: HTMLElement) {
  const lenta = obolochka.querySelector<HTMLElement>('[data-prokrutka]');
  if (!lenta) return;
  const nazad = obolochka.querySelector<HTMLElement>('[data-lenta-strelka="nazad"]');
  const vpered = obolochka.querySelector<HTMLElement>('[data-lenta-strelka="vpered"]');

  const obnovit = () => {
    const estNazad = lenta.scrollLeft > ZAPAS;
    const estVpered = lenta.scrollLeft + lenta.clientWidth < lenta.scrollWidth - ZAPAS;
    if (nazad) nazad.hidden = !estNazad;
    if (vpered) vpered.hidden = !estVpered;
    obolochka.classList.toggle('lenta--est-nazad', estNazad);
    obolochka.classList.toggle('lenta--est-vpered', estVpered);
  };

  const plavno = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shag = (znak: number) => {
    // Восемь десятых видимой ширины: на экране остаётся кусок предыдущего
    // кадра, и видно, что лента сдвинулась, а не подменилась целиком.
    lenta.scrollBy({ left: znak * lenta.clientWidth * 0.8, behavior: plavno ? 'smooth' : 'auto' });
  };
  nazad?.addEventListener('click', () => shag(-1));
  vpered?.addEventListener('click', () => shag(1));

  // Вертикальное колесо мыши переводим в горизонтальную прокрутку ленты.
  // Событие перехватывается только пока ленте есть куда ехать, иначе
  // страница перестанет прокручиваться над этим местом.
  lenta.addEventListener('wheel', (sobytie) => {
    if (sobytie.deltaY === 0 || Math.abs(sobytie.deltaX) > Math.abs(sobytie.deltaY)) return;
    const kuda = lenta.scrollLeft + sobytie.deltaY;
    const predel = lenta.scrollWidth - lenta.clientWidth;
    if ((sobytie.deltaY < 0 && lenta.scrollLeft <= 0) || (sobytie.deltaY > 0 && lenta.scrollLeft >= predel)) return;
    sobytie.preventDefault();
    lenta.scrollLeft = Math.max(0, Math.min(predel, kuda));
  }, { passive: false });

  lenta.addEventListener('scroll', obnovit, { passive: true });
  // Ширина ленты меняется от размера окна и от того, что в ней лежит.
  new ResizeObserver(obnovit).observe(lenta);
  obnovit();
}

export function lentyProkrutki(koren: ParentNode = document) {
  koren.querySelectorAll<HTMLElement>('[data-lenta-obolochka]').forEach(nastroit);
}
