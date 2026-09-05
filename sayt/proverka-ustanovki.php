<?php
// Разовая проверка установки на хостинге. Открыть в браузере по адресу
// /milk-site/proverka-ustanovki.php, посмотреть, что красное, — и удалить
// этот файл, когда сайт заработает.
//
// Страница нужна потому, что при сбое посетитель видит только вежливую
// заглушку, а причина уходит в журнал, куда владельцу лезть незачем.
// Здесь всё то же самое сказано словами.

declare(strict_types=1);

// Свои ошибки эта страница показывает: она для того и открыта.
ini_set('display_errors', '1');
error_reporting(E_ALL);

$koren = __DIR__;
$strok = [];

// Настройки подключаются отдельно и осторожно: если сломаны именно они,
// страница должна это показать, а не упасть вместе с сайтом.
$nastroykiCheli = true;
try {
    require_once __DIR__ . '/app/konfig.php';
} catch (Throwable $e) {
    $nastroykiCheli = false;
    $bedaNastroek = $e->getMessage();
}

/** Строка отчёта: имя, признак «хорошо», пояснение. */
function stroka(string $chto, bool $horosho, string $podrobno = ''): array
{
    return ['chto' => $chto, 'horosho' => $horosho, 'podrobno' => $podrobno];
}

// ---- Окружение ---------------------------------------------------------
$versiya = PHP_VERSION;
$strok[] = stroka(
    'Версия PHP',
    PHP_VERSION_ID >= 80200,
    PHP_VERSION_ID >= 80200
        ? $versiya
        : "$versiya — нужна 8.2 или новее. Переключается в панели хостинга.",
);

foreach (['json' => 'чтение меню', 'gd' => 'обработка фотографий в панели', 'mbstring' => 'русские тексты'] as $rasshirenie => $zachem) {
    $est = extension_loaded($rasshirenie);
    $strok[] = stroka(
        "Расширение $rasshirenie",
        $est,
        $est ? 'на месте' : "не подключено — без него не работает $zachem",
    );
}

// ---- Файлы -------------------------------------------------------------
$nuzhnye = [
    'index.php' => 'точка входа',
    '.htaccess' => 'без него открывается только главная',
    'app/konfig.php' => 'настройки',
    'dannye/menu.json' => 'меню',
    'dannye/razmery.json' => 'размеры картинок',
    'statika/sayt.css' => 'стили',
    'fonts/shrifty.css' => 'шрифты',
];
foreach ($nuzhnye as $put => $zachem) {
    $polnyy = "$koren/$put";
    $est = is_file($polnyy);
    $strok[] = stroka(
        "Файл $put",
        $est && is_readable($polnyy),
        $est ? (is_readable($polnyy) ? 'на месте' : 'есть, но не читается — проверьте права') : "нет ($zachem)",
    );
}

$papki = ['images/menu' => 'фотографии блюд', 'images/photo' => 'снимки для главной'];
foreach ($papki as $put => $zachem) {
    $skolko = is_dir("$koren/$put") ? count(glob("$koren/$put/*") ?: []) : -1;
    $strok[] = stroka(
        "Папка $put",
        $skolko > 0,
        $skolko > 0 ? "файлов: $skolko" : ($skolko === 0 ? "пустая — $zachem не покажутся" : 'нет'),
    );
}

// ---- Данные ------------------------------------------------------------
$syroe = @file_get_contents("$koren/dannye/menu.json");
if ($syroe === false) {
    $strok[] = stroka('Разбор menu.json', false, 'файл не читается');
} else {
    $razobrano = json_decode($syroe, true);
    if (!is_array($razobrano)) {
        $strok[] = stroka('Разбор menu.json', false, 'повреждён: ' . json_last_error_msg());
    } elseif (!isset($razobrano['items'], $razobrano['categories'])) {
        $strok[] = stroka('Разбор menu.json', false, 'нет разделов items и categories');
    } else {
        $strok[] = stroka('Разбор menu.json', true, count($razobrano['items']) . ' позиций, '
            . count($razobrano['categories']) . ' категорий');
    }
}

$syroeR = @file_get_contents("$koren/dannye/razmery.json");
$razmery = $syroeR === false ? null : json_decode($syroeR, true);
if (!is_array($razmery)) {
    $strok[] = stroka('Разбор razmery.json', false, 'не читается или повреждён');
} else {
    $foto = count($razmery['foto'] ?? []);
    $blyuda = count($razmery['blyuda'] ?? []);
    $strok[] = stroka('Разбор razmery.json', $foto > 0 && $blyuda > 0,
        "лайфстайл-кадров $foto, блюд $blyuda"
        . ($foto ? '' : ' — без раздела foto главная не соберётся'));
}

// ---- Права на запись ---------------------------------------------------
foreach (['dannye' => 'правки меню из панели', 'images/menu' => 'загрузка фотографий'] as $put => $zachem) {
    $polnyy = "$koren/$put";
    $mozhno = is_dir($polnyy) && is_writable($polnyy);
    $strok[] = stroka("Запись в $put", $mozhno,
        $mozhno ? 'разрешена' : "запрещена — не будет работать $zachem");
}

// ---- Адрес -------------------------------------------------------------
if (!$nastroykiCheli || !defined('BAZA')) {
    $strok[] = stroka('Настройки app/konfig.php', false,
        $nastroykiCheli ? 'файл прочитан, но в нём нет BAZA' : ($bedaNastroek ?? 'файл не читается'));
} else {
    $svoyPut = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $papkaSayta = rtrim(dirname($svoyPut), '/');
    $strok[] = stroka(
        'Подпапка сайта',
        $papkaSayta === BAZA,
        $papkaSayta === BAZA
            ? BAZA
            : "сайт лежит в «$papkaSayta», а в app/konfig.php записано «" . BAZA . "» — ссылки и стили будут вести не туда",
    );
}

$perepisyvaet = function_exists('apache_get_modules')
    ? in_array('mod_rewrite', apache_get_modules(), true)
    : null;
$strok[] = stroka('Переписывание адресов (mod_rewrite)', $perepisyvaet !== false,
    $perepisyvaet === null ? 'проверить отсюда нельзя — откройте /menu и посмотрите' : ($perepisyvaet ? 'включено' : 'выключено'));

// ---- Журнал ------------------------------------------------------------
$zhurnal = "$koren/dannye/oshibki.log";
$hvost = is_file($zhurnal) ? trim((string) file_get_contents($zhurnal)) : '';
// Полный путь до папки сайта из сообщений вырезается: страница открыта
// всем, кто знает адрес, а устройство хостинга посторонним знать незачем.
$hvost = str_replace([str_replace('\\', '/', $koren), $koren], '…', $hvost);
$posledniye = $hvost === '' ? [] : array_slice(explode("\n", $hvost), -8);

$ploho = count(array_filter($strok, static fn($s) => !$s['horosho']));
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Проверка установки — «Милк»</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0; padding: 2rem 1rem; background: #F8EEE4; color: #3D2B1C; }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.5rem; }
  ul { list-style: none; padding: 0; }
  li { display: flex; gap: .75rem; padding: .5rem .75rem; border-radius: .5rem; background: #fff; margin-bottom: .35rem; }
  li.ploho { background: #FDECEA; }
  .znak { flex: none; font-weight: 700; }
  .znak--ok { color: #2E7D32; }
  .znak--net { color: #C62828; }
  .chto { font-weight: 600; }
  .podrobno { color: #78644E; }
  pre { background: #fff; padding: 1rem; border-radius: .5rem; overflow-x: auto; font-size: .875rem; }
  .itog { padding: 1rem; border-radius: .5rem; margin-bottom: 1.5rem; background: #fff; }
  .itog--ploho { background: #FDECEA; }
</style>
</head>
<body>
<main>
  <h1>Проверка установки</h1>

  <div class="itog <?= $ploho ? 'itog--ploho' : '' ?>">
    <?php if ($ploho): ?>
      <strong>Не в порядке: <?= $ploho ?>.</strong> Красные строки ниже — причина того,
      что сайт показывает «Что-то пошло не так».
    <?php else: ?>
      <strong>Всё на месте.</strong> Если сайт всё равно не открывается, посмотрите
      журнал ошибок внизу страницы.
    <?php endif; ?>
  </div>

  <ul>
    <?php foreach ($strok as $s): ?>
      <li class="<?= $s['horosho'] ? '' : 'ploho' ?>">
        <span class="znak <?= $s['horosho'] ? 'znak--ok' : 'znak--net' ?>"><?= $s['horosho'] ? '✓' : '✗' ?></span>
        <span><span class="chto"><?= htmlspecialchars($s['chto'], ENT_QUOTES) ?></span>
        <?php if ($s['podrobno']): ?><br /><span class="podrobno"><?= htmlspecialchars($s['podrobno'], ENT_QUOTES) ?></span><?php endif; ?></span>
      </li>
    <?php endforeach; ?>
  </ul>

  <h2>Журнал ошибок</h2>
  <?php if ($posledniye): ?>
    <pre><?= htmlspecialchars(implode("\n", $posledniye), ENT_QUOTES) ?></pre>
  <?php else: ?>
    <p class="podrobno">Пусто — либо сбоев не было, либо в папку <code>dannye</code> нельзя писать.</p>
  <?php endif; ?>

  <p class="podrobno">Когда сайт заработает, удалите этот файл:
  <code>proverka-ustanovki.php</code>.</p>
</main>
</body>
</html>
