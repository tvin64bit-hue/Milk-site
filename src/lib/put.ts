// Сайт разворачивается в подкаталоге репозитория на GitHub Pages,
// поэтому все внутренние ссылки и пути к файлам собираются через эту функцию.
export function put(adres: string): string {
  const baza = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (!adres.startsWith('/')) return `${baza}/${adres}`;
  return `${baza}${adres}` || '/';
}
