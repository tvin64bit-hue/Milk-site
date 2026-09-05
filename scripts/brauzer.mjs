// Запуск браузера для проверок — одинаково на любой машине.
//
// Раньше в каждой проверке был прописан путь к готовому Chromium той среды,
// где их писали. На чужой машине — на Windows в первую очередь — такого
// файла нет, и проверка падала ещё до первой страницы.
//
// Теперь порядок такой: сначала обычный запуск, когда браузер поставлен
// командой «npx playwright install chromium» и Playwright сам знает, где он.
// Если не вышло — ищем в хранилище, на которое указывает переменная
// PLAYWRIGHT_BROWSERS_PATH: в некоторых сборочных образах браузер лежит
// там под своим именем, а не в ожидаемой Playwright папке. И только если
// не нашли ничего, печатаем команду установки вместо длинной трассировки.
//
// Путь можно задать и вручную: BRAUZER_PUT=/куда/угодно/chrome npm run check.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

/** Где браузер может лежать внутри хранилища PLAYWRIGHT_BROWSERS_PATH. */
function vozmozhnyePuti(hranilishche) {
  const imena = process.platform === 'win32'
    ? ['chrome.exe', 'headless_shell.exe']
    : process.platform === 'darwin'
      ? ['Chromium.app/Contents/MacOS/Chromium', 'chrome', 'chromium']
      : ['chrome', 'chromium', 'headless_shell'];
  const puti = [];
  for (const imya of ['chromium', ...imena]) { puti.push(join(hranilishche, imya)); }
  for (const imya of imena) {
    puti.push(join(hranilishche, 'chromium', imya));
    puti.push(join(hranilishche, 'chromium', 'chrome-linux', imya));
  }
  return puti;
}

export async function otkrytBrauzer(nastroyki = {}) {
  const vruchnuyu = process.env.BRAUZER_PUT;
  if (vruchnuyu) {
    return chromium.launch({ ...nastroyki, executablePath: vruchnuyu });
  }

  try {
    return await chromium.launch(nastroyki);
  } catch (oshibka) {
    const hranilishche = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (hranilishche) {
      const nayden = vozmozhnyePuti(hranilishche).find((p) => existsSync(p));
      if (nayden) { return chromium.launch({ ...nastroyki, executablePath: nayden }); }
    }
    console.error('\nБраузер для проверок не найден. Поставьте его командой:\n');
    console.error('  npx playwright install chromium\n');
    console.error('Если браузер уже есть, укажите путь к нему:\n');
    console.error('  BRAUZER_PUT=/путь/к/chrome npm run check\n');
    process.exit(1);
  }
}
