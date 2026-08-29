import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { ADRES, PODKATALOG } from './sayt.config.mjs';

// Адрес сайта задаётся в sayt.config.mjs, здесь только подставляется.
export default defineConfig({
  site: ADRES,
  base: PODKATALOG,
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [
    // Служебная страница визуального языка в поиск не отдаётся.
    sitemap({ filter: (adres) => !adres.includes('/styleguide') }),
  ],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
