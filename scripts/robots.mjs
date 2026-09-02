// Собирает robots.txt из того же конфига, что и остальные адреса,
// чтобы при переезде на свой домен не пришлось править его руками.
import { writeFileSync } from 'node:fs';
import { POLNYY_ADRES } from '../sayt.config.mjs';

writeFileSync('public/robots.txt', `User-agent: *
Allow: /
Disallow: /styleguide

Sitemap: ${POLNYY_ADRES}/sitemap-index.xml
`);
console.log(`  robots.txt: карта сайта ${POLNYY_ADRES}/sitemap-index.xml`);
