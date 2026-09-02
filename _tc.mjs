import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [imya, opts] of [['iPhone 13', devices['iPhone 13']], ['iPhone SE', devices['iPhone SE']], ['Pixel 5', devices['Pixel 5']], ['окно 390', { viewport: { width: 390, height: 844 } }]]) {
  const c = await b.newContext(opts);
  const p = await c.newPage();
  for (const [gde, adres] of [['главная', '/'], ['меню', '/menu'], ['блюдо', '/menu/shakshuka']]) {
    await p.goto('http://localhost:4321/Milk-site' + adres, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: 'html,body{overflow-x:visible !important}' });
    await p.waitForTimeout(300);
    const d = await p.evaluate(() => ({ ekran: document.documentElement.clientWidth, iw: innerWidth, doc: document.documentElement.scrollWidth }));
    const ok = d.doc <= d.ekran + 1 && d.iw <= d.ekran + 1;
    console.log(`${imya.padEnd(10)} ${gde.padEnd(8)} экран ${d.ekran}, innerWidth ${d.iw}, документ ${d.doc}  ${ok ? '✓' : '✗'}`);
  }
  await c.close();
}
await b.close();
