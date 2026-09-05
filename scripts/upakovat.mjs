// Складывает папку sayt/ в один архив для загрузки на хостинг.
//
// Zip собирается здесь же, а не внешней программой: на Windows её обычно
// нет, а тянуть ради этого библиотеку незачем — формат несложный, а всё
// нужное для сжатия и контрольных сумм есть в самом Node.
//
// Запуск: npm run zip
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { join, relative, sep } from 'node:path';

const PAPKA = 'sayt';
const ARHIV = 'milk-site-sayt.zip';

// Внутри архива разделитель всегда прямая косая черта — так требует формат,
// и так архив одинаково раскрывается и на сервере, и в проводнике Windows.
const vArhive = (put) => relative(PAPKA, put).split(sep).join('/');

function vseFajly(papka) {
  const najdeno = [];
  for (const zapis of readdirSync(papka, { withFileTypes: true })) {
    const put = join(papka, zapis.name);
    if (zapis.isDirectory()) { najdeno.push(...vseFajly(put)); } else { najdeno.push(put); }
  }
  return najdeno;
}

/** Дата и время файла в формате MS-DOS: так их хранит zip. */
function vremyaDos(data) {
  const vremya = ((data.getHours() << 11) | (data.getMinutes() << 5) | (data.getSeconds() / 2)) & 0xFFFF;
  const den = (((data.getFullYear() - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate()) & 0xFFFF;
  return { vremya, den };
}

if (!existsSync(PAPKA)) {
  console.error(`Папки ${PAPKA} нет. Сначала соберите её: npm run images && npm run sayt`);
  process.exit(1);
}

const faily = vseFajly(PAPKA).sort();
if (!faily.some((f) => vArhive(f).startsWith('images/'))) {
  console.error('В sayt/ нет картинок — соберите их: npm run images');
  process.exit(1);
}

const kuski = [];
const opis = [];
let smeshchenie = 0;

for (const put of faily) {
  const imya = Buffer.from(vArhive(put), 'utf8');
  const soderzhimoe = readFileSync(put);
  const summa = crc32(soderzhimoe);
  const szhatoe = deflateRawSync(soderzhimoe, { level: 9 });
  // Сжатие берётся только когда оно и правда уменьшает файл: webp и jpeg
  // уже сжаты, и второй проход делает их чуть больше.
  const vygodno = szhatoe.length < soderzhimoe.length;
  const dannye = vygodno ? szhatoe : soderzhimoe;
  const sposob = vygodno ? 8 : 0;
  const { vremya, den } = vremyaDos(statSync(put).mtime);

  const zagolovok = Buffer.alloc(30);
  zagolovok.writeUInt32LE(0x04034b50, 0);
  zagolovok.writeUInt16LE(20, 4);            // нужна версия 2.0
  zagolovok.writeUInt16LE(0x0800, 6);        // имена в UTF-8
  zagolovok.writeUInt16LE(sposob, 8);
  zagolovok.writeUInt16LE(vremya, 10);
  zagolovok.writeUInt16LE(den, 12);
  zagolovok.writeUInt32LE(summa, 14);
  zagolovok.writeUInt32LE(dannye.length, 18);
  zagolovok.writeUInt32LE(soderzhimoe.length, 22);
  zagolovok.writeUInt16LE(imya.length, 26);
  kuski.push(zagolovok, imya, dannye);

  const zapis = Buffer.alloc(46);
  zapis.writeUInt32LE(0x02014b50, 0);
  zapis.writeUInt16LE(20, 4);
  zapis.writeUInt16LE(20, 6);
  zapis.writeUInt16LE(0x0800, 8);
  zapis.writeUInt16LE(sposob, 10);
  zapis.writeUInt16LE(vremya, 12);
  zapis.writeUInt16LE(den, 14);
  zapis.writeUInt32LE(summa, 16);
  zapis.writeUInt32LE(dannye.length, 20);
  zapis.writeUInt32LE(soderzhimoe.length, 24);
  zapis.writeUInt16LE(imya.length, 28);
  // Права на файл после распаковки. Приведение к беззнаковому обязательно:
  // сдвиг в JavaScript даёт число со знаком, и 0o100644 уходит в минус.
  zapis.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  zapis.writeUInt32LE(smeshchenie, 42);
  opis.push(Buffer.concat([zapis, imya]));

  smeshchenie += zagolovok.length + imya.length + dannye.length;
}

const opisVmeste = Buffer.concat(opis);
const konec = Buffer.alloc(22);
konec.writeUInt32LE(0x06054b50, 0);
konec.writeUInt16LE(faily.length, 8);
konec.writeUInt16LE(faily.length, 10);
konec.writeUInt32LE(opisVmeste.length, 12);
konec.writeUInt32LE(smeshchenie, 16);

writeFileSync(ARHIV, Buffer.concat([...kuski, opisVmeste, konec]));

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`${ARHIV}: ${faily.length} файлов, ${mb(statSync(ARHIV).size)} МБ`);
console.log('Распаковывать в подкаталог milk-site на хостинге — папку sayt внутри архива не создаёт.');
