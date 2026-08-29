import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Сайт разворачивается на GitHub Pages в подкаталоге репозитория.
// Если появится собственный домен — поменять site на него, а base на '/'.
export default defineConfig({
  site: 'https://tvin64bit-hue.github.io',
  base: '/Milk-site',
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [sitemap()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
