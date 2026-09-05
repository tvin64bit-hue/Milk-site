<?php
// Разовая проверка установки на хостинге. Открыть в браузере по адресу
// /milk-site/proverka-ustanovki.php, посмотреть, что красное, — и удалить
// этот файл, когда сайт заработает.
//
// Написана нарочно на старом синтаксисе: ни объявлений типов, ни оператора
// ??, ни стрелочных функций. Страница должна открываться там, где не
// открывается сам сайт, — а самая частая причина этого и есть слишком
// старая версия PHP. Диагностика, которая падает вместе с пациентом,
// бесполезна: на PHP 7.1 первая же версия этой страницы не запустилась.
//
// По той же причине настройки сайта не подключаются, а читаются как текст:
// app/konfig.php на старой версии PHP не разбирается вовсе.

ini_set('display_errors', '1');
error_reporting(E_ALL);

$koren = dirname(__FILE__);
$strok = [];

function stroka($chto, $horosho, $podrobno)
{
    return ['chto' => $chto, 'horosho' => $horosho, 'podrobno' => $podrobno];
}

function znachenie($massiv, $klyuch, $inache)
{
    return isset($massiv[$klyuch]) ? $massiv[$klyuch] : $inache;
}

// ---- Версия PHP. Первая и самая частая причина -------------------------
$hvatit = PHP_VERSION_ID >= 80200;
$strok[] = stroka(
    'Версия PHP',
    $hvatit,
    $hvatit
        ? PHP_VERSION
        : PHP_VERSION . ' — сайту нужна 8.2 или новее. Это главная причина: на этой '
          . 'версии он не работает совсем. Версия переключается в панели хостинга, '
          . 'в настройках сайта или домена.'
);

$rasshireniya = [
    'json' => 'чтение меню',
    'gd' => 'обработка фотографий в панели',
    'mbstring' => 'русские тексты',
];
foreach ($rasshireniya as $rasshirenie => $zachem) {
    $est = extension_loaded($rasshirenie);
    $strok[] = stroka(
        'Расширение ' . $rasshirenie,
        $est,
        $est ? 'на месте' : 'не подключено — без него не работает ' . $zachem
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
    $polnyy = $koren . '/' . $put;
    $est = is_file($polnyy);
    $chitaetsya = $est && is_readable($polnyy);
    $strok[] = stroka(
        'Файл ' . $put,
        $chitaetsya,
        $est
            ? ($chitaetsya ? 'на месте' : 'есть, но не читается — проверьте права')
            : 'нет (' . $zachem . ')'
    );
}

$papki = ['images/menu' => 'фотографии блюд', 'images/photo' => 'снимки для главной'];
foreach ($papki as $put => $zachem) {
    $polnyy = $koren . '/' . $put;
    if (!is_dir($polnyy)) {
        $strok[] = stroka('Папка ' . $put, false, 'нет');
        continue;
    }
    $spisok = glob($polnyy . '/*');
    $skolko = $spisok ? count($spisok) : 0;
    $strok[] = stroka(
        'Папка ' . $put,
        $skolko > 0,
        $skolko > 0 ? 'файлов: ' . $skolko : 'пустая — ' . $zachem . ' не покажутся'
    );
}

// ---- Данные ------------------------------------------------------------
$syroe = @file_get_contents($koren . '/dannye/menu.json');
if ($syroe === false) {
    $strok[] = stroka('Разбор menu.json', false, 'файл не читается');
} else {
    $razobrano = json_decode($syroe, true);
    if (!is_array($razobrano)) {
        $strok[] = stroka('Разбор menu.json', false, 'повреждён: ' . json_last_error_msg());
    } elseif (!isset($razobrano['items']) || !isset($razobrano['categories'])) {
        $strok[] = stroka('Разбор menu.json', false, 'нет разделов items и categories');
    } else {
        $strok[] = stroka('Разбор menu.json', true,
            count($razobrano['items']) . ' позиций, ' . count($razobrano['categories']) . ' категорий');
    }
}

$syroeR = @file_get_contents($koren . '/dannye/razmery.json');
$razmery = $syroeR === false ? null : json_decode($syroeR, true);
if (!is_array($razmery)) {
    $strok[] = stroka('Разбор razmery.json', false, 'не читается или повреждён');
} else {
    $foto = count(znachenie($razmery, 'foto', []));
    $blyuda = count(znachenie($razmery, 'blyuda', []));
    $strok[] = stroka('Разбор razmery.json', $foto > 0 && $blyuda > 0,
        'лайфстайл-кадров ' . $foto . ', блюд ' . $blyuda
        . ($foto ? '' : ' — без раздела foto главная не соберётся'));
}

// ---- Права на запись ---------------------------------------------------
$zapis = ['dannye' => 'правки меню из панели', 'images/menu' => 'загрузка фотографий'];
foreach ($zapis as $put => $zachem) {
    $polnyy = $koren . '/' . $put;
    $mozhno = is_dir($polnyy) && is_writable($polnyy);
    $strok[] = stroka('Запись в ' . $put, $mozhno,
        $mozhno ? 'разрешена' : 'запрещена — не будет работать ' . $zachem);
}

// ---- Подпапка ----------------------------------------------------------
// Настройки читаются как текст: на старой версии PHP этот файл не
// разбирается, и подключить его значило бы упасть вместе с сайтом.
$nastroyki = @file_get_contents($koren . '/app/konfig.php');
$baza = null;
if ($nastroyki !== false && preg_match("~const\s+BAZA\s*=\s*'([^']*)'~", $nastroyki, $sovpadenie)) {
    $baza = $sovpadenie[1];
}
$svoyPut = str_replace('\\', '/', znachenie($_SERVER, 'SCRIPT_NAME', ''));
$papkaSayta = rtrim(dirname($svoyPut), '/');
if ($baza === null) {
    $strok[] = stroka('Подпапка сайта', false, 'в app/konfig.php не нашлась строка с BAZA');
} else {
    $sovpalo = $papkaSayta === $baza;
    $strok[] = stroka('Подпапка сайта', $sovpalo,
        $sovpalo
            ? $baza
            : 'сайт лежит в «' . $papkaSayta . '», а в app/konfig.php записано «' . $baza
              . '» — ссылки и картинки будут вести не туда');
}

$moduli = function_exists('apache_get_modules') ? apache_get_modules() : null;
$perepisyvaet = $moduli === null ? null : in_array('mod_rewrite', $moduli, true);
$strok[] = stroka('Переписывание адресов (mod_rewrite)', $perepisyvaet !== false,
    $perepisyvaet === null
        ? 'проверить отсюда нельзя — откройте /menu и посмотрите'
        : ($perepisyvaet ? 'включено' : 'выключено — работать будет только главная'));

// ---- Журнал ------------------------------------------------------------
$zhurnal = $koren . '/dannye/oshibki.log';
$hvost = is_file($zhurnal) ? trim(strval(file_get_contents($zhurnal))) : '';
// Полный путь до папки сайта из сообщений вырезается: страница открыта
// всем, кто знает адрес, а устройство хостинга посторонним знать незачем.
$hvost = str_replace([str_replace('\\', '/', $koren), $koren], '…', $hvost);
$posledniye = $hvost === '' ? [] : array_slice(explode("\n", $hvost), -8);

$ploho = 0;
foreach ($strok as $s) {
    if (!$s['horosho']) { $ploho++; }
}
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

  <div class="itog <?php echo $ploho ? 'itog--ploho' : ''; ?>">
    <?php if ($ploho): ?>
      <strong>Не в порядке: <?php echo $ploho; ?>.</strong> Красные строки ниже — причина того,
      что сайт показывает «Что-то пошло не так». Начинать надо с самой верхней.
    <?php else: ?>
      <strong>Всё на месте.</strong> Если сайт всё равно не открывается, посмотрите
      журнал ошибок внизу страницы.
    <?php endif; ?>
  </div>

  <ul>
    <?php foreach ($strok as $s): ?>
      <li class="<?php echo $s['horosho'] ? '' : 'ploho'; ?>">
        <span class="znak <?php echo $s['horosho'] ? 'znak--ok' : 'znak--net'; ?>"><?php echo $s['horosho'] ? '✓' : '✗'; ?></span>
        <span><span class="chto"><?php echo htmlspecialchars($s['chto'], ENT_QUOTES); ?></span>
        <?php if ($s['podrobno']): ?><br /><span class="podrobno"><?php echo htmlspecialchars($s['podrobno'], ENT_QUOTES); ?></span><?php endif; ?></span>
      </li>
    <?php endforeach; ?>
  </ul>

  <h2>Журнал ошибок</h2>
  <?php if ($posledniye): ?>
    <pre><?php echo htmlspecialchars(implode("\n", $posledniye), ENT_QUOTES); ?></pre>
  <?php else: ?>
    <p class="podrobno">Пусто — либо сбоев не было, либо в папку <code>dannye</code> нельзя писать.</p>
  <?php endif; ?>

  <p class="podrobno">Когда сайт заработает, удалите этот файл:
  <code>proverka-ustanovki.php</code>.</p>
</main>
</body>
</html>
