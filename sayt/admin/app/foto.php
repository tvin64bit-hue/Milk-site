<?php
// Приём и обработка снимка блюда.
//
// Тяжёлый конвейер нормализации остаётся на Node и правит старые кадры.
// Здесь задача проще: обрезать по рамке, уменьшить и сохранить под
// идентификатором позиции — никогда под именем, которое прислал браузер.

declare(strict_types=1);

require_once __DIR__ . '/../../app/menu.php';

/** Предел размера принимаемого файла. */
const PREDEL_FAJLA = 12 * 1024 * 1024;

/** Что умеет разобрать GD. HEIC с айфона сюда не входит — о нём отдельная ошибка. */
const DOPUSTIMYE_TIPY = ['image/jpeg', 'image/png', 'image/webp'];

/** Ширины квадратных версий — те же, что делает конвейер. */
const SHIRINY_KVADRATA = [320, 540];
/** Кадр для страницы блюда. Шире 480 px снимки не выводятся. */
const SHIRINA_BOLSHOGO = 480;

const KACHESTVO_WEBP = 76;
const KACHESTVO_JPEG = 78;

/** Человеческий размер: 12582912 → «12 МБ». */
function razmer_slovami(int $bajt): string
{
    if ($bajt >= 1024 * 1024) { return round($bajt / 1024 / 1024, 1) . ' МБ'; }
    return round($bajt / 1024) . ' КБ';
}

/** Предел, который реально действует: меньшее из настроек PHP и нашего. */
function deystvuyushchiy_predel(): int
{
    $vBajty = static function (string $znachenie): int {
        $znachenie = trim($znachenie);
        $chislo = (int) $znachenie;
        return match (strtolower(substr($znachenie, -1))) {
            'g' => $chislo * 1024 * 1024 * 1024,
            'm' => $chislo * 1024 * 1024,
            'k' => $chislo * 1024,
            default => $chislo,
        };
    };
    $predely = array_filter([
        PREDEL_FAJLA,
        $vBajty((string) ini_get('upload_max_filesize')),
        $vBajty((string) ini_get('post_max_size')),
    ]);
    return (int) min($predely);
}

/** Проверяет присланный файл и возвращает его тип или бросает ошибку. */
function proverit_fajl(array $fajl): string
{
    $oshibki = [
        UPLOAD_ERR_INI_SIZE => 'Файл больше, чем разрешает сервер (' . ini_get('upload_max_filesize') . ').',
        UPLOAD_ERR_FORM_SIZE => 'Файл слишком большой.',
        UPLOAD_ERR_PARTIAL => 'Файл передался не полностью — попробуйте ещё раз.',
        UPLOAD_ERR_NO_FILE => 'Файл не выбран.',
        UPLOAD_ERR_NO_TMP_DIR => 'На сервере нет временной папки для загрузок.',
        UPLOAD_ERR_CANT_WRITE => 'Сервер не смог записать файл на диск.',
        UPLOAD_ERR_EXTENSION => 'Загрузку остановило расширение PHP.',
    ];
    $kod = $fajl['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($kod !== UPLOAD_ERR_OK) {
        throw new RuntimeException($oshibki[$kod] ?? 'Не удалось принять файл.');
    }
    // Без этой проверки можно подсунуть путь к любому файлу на сервере.
    if (!is_uploaded_file($fajl['tmp_name'])) {
        throw new RuntimeException('Файл не был загружен через форму.');
    }
    if ($fajl['size'] > deystvuyushchiy_predel()) {
        throw new RuntimeException(
            'Снимок весит ' . razmer_slovami((int) $fajl['size']) . ', а можно не больше '
            . razmer_slovami(deystvuyushchiy_predel()) . '. Уменьшите фотографию и попробуйте снова.',
        );
    }

    // Тип определяется по содержимому. Расширению верить нельзя: файл
    // с именем «foto.jpg» может оказаться скриптом.
    $svedeniya = @getimagesize($fajl['tmp_name']);
    $tip = $svedeniya['mime'] ?? null;
    if ($tip === null) {
        $poSoderzhimomu = (new finfo(FILEINFO_MIME_TYPE))->file($fajl['tmp_name']);
        if ($poSoderzhimomu === 'image/heic' || $poSoderzhimomu === 'image/heif') {
            throw new RuntimeException(
                'Это снимок в формате HEIC — такие мы не умеем открывать. В настройках айфона '
                . 'выберите «Камера → Форматы → Наиболее совместимый» или пришлите JPEG.',
            );
        }
        throw new RuntimeException('Это не изображение. Нужен файл JPEG, PNG или WebP.');
    }
    if (!in_array($tip, DOPUSTIMYE_TIPY, true)) {
        throw new RuntimeException("Формат {$tip} не подходит. Нужен JPEG, PNG или WebP.");
    }
    return $tip;
}

/** Открывает изображение с учётом поворота, записанного камерой. */
function otkryt_izobrazhenie(string $put, string $tip): GdImage
{
    $kartinka = match ($tip) {
        'image/jpeg' => @imagecreatefromjpeg($put),
        'image/png' => @imagecreatefrompng($put),
        'image/webp' => @imagecreatefromwebp($put),
        default => false,
    };
    if (!$kartinka) {
        throw new RuntimeException('Файл повреждён — изображение не открывается.');
    }
    // Снимки с телефона часто лежат «на боку», а правильная сторона
    // записана в EXIF. Без разворота обрезка пойдёт не по тому месту.
    if ($tip === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($put);
        $ugol = match ((int) ($exif['Orientation'] ?? 1)) { 3 => 180, 6 => -90, 8 => 90, default => 0 };
        if ($ugol !== 0) {
            $povernutoe = imagerotate($kartinka, $ugol, 0);
            if ($povernutoe) { imagedestroy($kartinka); $kartinka = $povernutoe; }
        }
    }
    return $kartinka;
}

/**
 * Обрезает по присланной рамке и сохраняет все нужные версии.
 * Возвращает размеры для razmery.json.
 *
 * @param array $ramka x, y, width, height в пикселях исходника
 */
function obrabotat_snimok(array $fajl, string $id, array $ramka): array
{
    $tip = proverit_fajl($fajl);
    $ishodnik = otkryt_izobrazhenie($fajl['tmp_name'], $tip);

    $shirinaIshodnika = imagesx($ishodnik);
    $vysotaIshodnika = imagesy($ishodnik);

    // Рамка приходит из браузера, поэтому её значения не принимаются на веру.
    $x = max(0, min($shirinaIshodnika - 1, (int) round((float) ($ramka['x'] ?? 0))));
    $y = max(0, min($vysotaIshodnika - 1, (int) round((float) ($ramka['y'] ?? 0))));
    $storona = (int) round((float) ($ramka['width'] ?? 0));
    if ($storona <= 0) {
        $storona = min($shirinaIshodnika, $vysotaIshodnika);
        $x = (int) (($shirinaIshodnika - $storona) / 2);
        $y = (int) (($vysotaIshodnika - $storona) / 2);
    }
    $storona = min($storona, $shirinaIshodnika - $x, $vysotaIshodnika - $y);
    if ($storona < 80) {
        imagedestroy($ishodnik);
        throw new RuntimeException('Выбранная область слишком мала — нужен участок не меньше 80 пикселей.');
    }

    $kvadrat = imagecrop($ishodnik, ['x' => $x, 'y' => $y, 'width' => $storona, 'height' => $storona]);
    imagedestroy($ishodnik);
    if (!$kvadrat) {
        throw new RuntimeException('Не удалось обрезать снимок.');
    }

    $papka = KOREN . '/images/menu';
    if (!is_dir($papka) && !@mkdir($papka, 0755, true)) {
        imagedestroy($kvadrat);
        throw new RuntimeException('Нет папки для снимков и её не удалось создать.');
    }

    $sohranit = static function (GdImage $kadr, string $imya) use ($papka): void {
        // Имя файла берётся из идентификатора позиции, а не из имени,
        // которое прислал браузер: так на диск не попадёт чужое имя.
        imagewebp($kadr, "{$papka}/{$imya}.webp", KACHESTVO_WEBP);
        imagejpeg($kadr, "{$papka}/{$imya}.jpg", KACHESTVO_JPEG);
    };

    $storonaItog = min($storona, max(SHIRINY_KVADRATA));
    foreach (SHIRINY_KVADRATA as $shirina) {
        $razmer = min($shirina, $storona);
        $umenshennoe = imagescale($kvadrat, $razmer, $razmer, IMG_BICUBIC);
        if (!$umenshennoe) { continue; }
        $sohranit($umenshennoe, "{$id}-kv-{$shirina}");
        imagedestroy($umenshennoe);
    }

    // Кадр для страницы блюда. Он тоже квадратный: рамка обрезки квадратная,
    // а растягивать обрезанное обратно в прямоугольник нечем.
    $bolshoeStorona = min($storona, SHIRINA_BOLSHOGO);
    $bolshoe = imagescale($kvadrat, $bolshoeStorona, $bolshoeStorona, IMG_BICUBIC);
    if ($bolshoe) {
        $sohranit($bolshoe, "{$id}-480");
        imagedestroy($bolshoe);
    }
    imagedestroy($kvadrat);

    return [
        'kvadrat' => ['width' => min($storonaItog, 540), 'height' => min($storonaItog, 540)],
        'bolshoe' => ['width' => $bolshoeStorona, 'height' => $bolshoeStorona],
    ];
}

/**
 * Переписывает razmery.json целиком: временный файл и переименование —
 * тот же порядок, что и для menu.json, по той же причине.
 *
 * Двумя пробелами, а не четырьмя: так формат PHP совпадает с тем, что
 * пишет scripts/process-images.mjs, и файл не расходится в отступах
 * в зависимости от того, кто его последним переписал.
 */
function zapisat_fajl_razmerov(array $dannye): void
{
    $fajl = KOREN . '/dannye/razmery.json';
    $tekst = json_encode($dannye, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($tekst === false) {
        throw new RuntimeException('Не удалось собрать JSON размеров.');
    }
    $tekst = preg_replace_callback(
        '~^(?: {4})+~m',
        static fn($s) => str_repeat('  ', (int) (strlen($s[0]) / 4)),
        $tekst,
    ) ?? $tekst;

    $vremennyy = $fajl . '.tmp' . bin2hex(random_bytes(4));
    if (@file_put_contents($vremennyy, $tekst . "\n", LOCK_EX) === false || !@rename($vremennyy, $fajl)) {
        @unlink($vremennyy);
        throw new RuntimeException('Не удалось записать размеры снимка.');
    }
}

/** Дописывает размеры снимка в razmery.json — без них сайт покажет заглушку. */
function zapisat_razmery(string $id, array $razmery): void
{
    $fajl = KOREN . '/dannye/razmery.json';
    $dannye = json_decode((string) @file_get_contents($fajl), true);
    if (!is_array($dannye)) {
        throw new RuntimeException('Не читается razmery.json.');
    }
    $dannye['blyuda'][$id] = $razmery;
    zapisat_fajl_razmerov($dannye);
}

/**
 * Удаляет файлы снимка позиции и его запись в razmery.json. Без второго
 * шага удалённая позиция оставляла бы мёртвую запись в файле размеров —
 * она не ломает сайт, но копится с каждым удалением.
 */
function udalit_snimok(string $id): void
{
    foreach (glob(KOREN . "/images/menu/{$id}-*.{webp,jpg}", GLOB_BRACE) ?: [] as $fajl) {
        @unlink($fajl);
    }
    $fajl = KOREN . '/dannye/razmery.json';
    $dannye = json_decode((string) @file_get_contents($fajl), true);
    if (is_array($dannye) && isset($dannye['blyuda'][$id])) {
        unset($dannye['blyuda'][$id]);
        zapisat_fajl_razmerov($dannye);
    }
}
