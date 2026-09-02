import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const bloki = ['.ekran', '.begushchaya', '.o-kafe', '.napravleniya', '.sety', '.zavtraki', '.kofe', '.bankety', '.galereya', '.kak-zakazat', '.kontakty'];
for (const sel of bloki) {
  const c = await b.newContext({ ...devices['iPhone 13'] });
  const p = await c.newPage();
  // прячем блок ДО раскладки
  await p.addInitScript((s) => {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll(s).forEach(el => el.remove());
    });
  }, sel);
  await p.goto('http://localhost:4321/Milk-site/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ innerWidth, documentWidth: document.documentElement.scrollWidth }));
  console.log(`без ${sel.padEnd(14)} → innerWidth ${d.innerWidth}, документ ${d.documentWidth}`);
  await c.close();
}
await b.close();
