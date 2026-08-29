// Чтение и подготовка данных меню. Единственный источник — menu.json в корне.
import dannye from '../../menu.json';
import razmery from './razmery.json';
import { put } from './put';
import fony from './fony-otchet.json';

export type Metka = 'hit' | 'detskoe' | 'ostroe' | 'dobavka';

export interface Blyudo {
  id: string;
  category: string;
  name: string;
  description: string;
  weight?: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  crop: 'top' | 'center' | 'bottom';
  badges: Metka[];
  available: boolean;
  setItems?: string[];
}

export interface Kategoriya {
  id: string;
  name: string;
  order: number;
}

export const MENU = dannye as unknown as {
  updated: string;
  categories: Kategoriya[];
  items: Blyudo[];
};

export const KATEGORII: Kategoriya[] = [...MENU.categories].sort((a, b) => a.order - b.order);
export const BLYUDA: Blyudo[] = MENU.items;

const poId = new Map(BLYUDA.map((b) => [b.id, b]));
const kategoriyaPoId = new Map(KATEGORII.map((k) => [k.id, k]));

export const blyudoPoId = (id: string) => poId.get(id);
export const kategoriyaPoIdent = (id: string) => kategoriyaPoId.get(id);

export const blyudaKategorii = (id: string) => BLYUDA.filter((b) => b.category === id);

export const kolichestvoVKategorii = (id: string) => blyudaKategorii(id).length;

// Названия меток для вывода и подписи для программ чтения с экрана.
export const NAZVANIYA_METOK: Record<Metka, string> = {
  hit: 'Хит',
  detskoe: 'Детское',
  ostroe: 'Острое',
  dobavka: 'Добавка',
};

/** Цена с неразрывным пробелом: 1999 → «1 999 ₽». Добавки выводятся с плюсом. */
export function cena(znachenie: number, dobavka = false): string {
  const razryady = znachenie.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${dobavka ? '+' : ''}${razryady} ₽`;
}

export const estDobavka = (b: Blyudo) => b.badges.includes('dobavka');

/** Заголовок вкладки и og:title страницы блюда. */
export const zagolovokBlyuda = (b: Blyudo) =>
  `${b.name} — ${b.price} ₽ | Кафе «Милк», Благовещенск`;

/** Описание страницы блюда: состав и цена, не длиннее 160 символов. */
export function opisanieBlyuda(b: Blyudo): string {
  const hvost = `${b.weight ? `${b.weight}. ` : ''}${cena(b.price)}. Заказ по телефону.`;
  const zapas = 160 - hvost.length - 2;
  const sostav = b.description.length > zapas ? `${b.description.slice(0, zapas - 1).trimEnd()}…` : b.description;
  return `${sostav}. ${hvost}`;
}

/** Осмысленный alt: название и первые слова состава. */
export function altBlyuda(b: Blyudo): string {
  const slova = b.description.split(/[,:.]/)[0].trim().toLowerCase();
  return `${b.name} — ${slova}`;
}

/** Пути к готовым файлам изображения. Если снимка нет — вернёт null. */
export function kartinka(b: Blyudo) {
  const r = (razmery as Razmery).blyuda[b.id];
  if (!b.image || !r) return null;
  return {
    kvadrat: {
      webp320: put(`/images/menu/${b.id}-kv-320.webp`),
      webp540: put(`/images/menu/${b.id}-kv-540.webp`),
      jpg: put(`/images/menu/${b.id}-kv-540.jpg`),
      ...r.kvadrat,
    },
    bolshoe: {
      webp: put(`/images/menu/${b.id}-480.webp`),
      jpg: put(`/images/menu/${b.id}-480.jpg`),
      ...r.bolshoe,
    },
  };
}

interface Razmery {
  blyuda: Record<string, { kvadrat: { width: number; height: number }; bolshoe: { width: number; height: number } }>;
  foto: Record<string, { width: number; height: number; alt: string }>;
  logo: { milk: { width: number; height: number } };
}

export const RAZMERY = razmery as Razmery;

/** Лайфстайл-кадр по имени: пути, размеры и готовый alt. */
export function foto(imya: keyof Razmery['foto'] | string) {
  const r = RAZMERY.foto[imya];
  if (!r) throw new Error(`Нет обработанного лайфстайл-кадра «${imya}». Запустите «npm run images».`);
  return {
    webp: (w: 480 | 960 | 1280) => put(`/images/photo/${imya}-${w}.webp`),
    jpg: (w: 480 | 960 | 1280) => put(`/images/photo/${imya}-${w}.jpg`),
    alt: r.alt,
    width: r.width,
    height: r.height,
  };
}

// Снимки чужой съёмки: чёрный сланец, чисто-белый и серый предметный фон.
// Обработкой они не спасаются и в подборках на главной выглядят чужеродно,
// поэтому идут только в каталог. Список считает scripts/opredelit-fon.mjs
// на сборке, руками его вести не нужно — после пересъёмки позиция уйдёт сама.
const CHUZHAYA_SYEMKA = new Set(fony.chuzhaya.map((f) => f.id));

/**
 * Позиции для подборок на главной: без снимка и с чужой съёмкой туда
 * не идут, в каталоге остаются все.
 */
export const dlyaPodborki = (spisok: Blyudo[]) =>
  spisok.filter((b) => b.image !== null && !CHUZHAYA_SYEMKA.has(b.id));

/** Список на пересъёмку — для отчётов и служебной страницы. */
export const NA_PERESYEMKU = fony.chuzhaya;

/** Позиции без снимка. Оставлено для мест, где важно только наличие фотографии. */
export const sFotografiey = (spisok: Blyudo[]) => spisok.filter((b) => b.image !== null);
