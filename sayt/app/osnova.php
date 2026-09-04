<?php
// Обёртка страницы: метатеги, шрифты, шапка, футер, сквозные слои.
// Перенос Bazovyy.astro.

declare(strict_types=1);

require_once __DIR__ . '/karkas.php';

/**
 * Начало страницы. Канонический адрес и Open Graph собираются из ADRES,
 * поэтому при переезде на другой домен правится одна строка в конфиге.
 */
function stranica_nachalo(array $o): void
{
    $zagolovok = $o['zagolovok'];
    $opisanie = $o['opisanie'];
    $kanon = rtrim(ADRES, '/') . '/' . ltrim($o['kanon'], '/');
    $kanon = rtrim($kanon, '/') === rtrim(ADRES, '/') ? rtrim(ADRES, '/') . '/' : $kanon;
    $ogTip = $o['ogTip'] ?? 'website';
    $ogKartinka = $o['ogKartinka'] ?? null;
    $shapkaSFonom = !empty($o['shapkaSFonom']);
    ?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title><?= e($zagolovok) ?></title>
<meta name="description" content="<?= e($opisanie) ?>" />
<link rel="canonical" href="<?= e($kanon) ?>" />

<meta property="og:type" content="<?= e($ogTip) ?>" />
<meta property="og:title" content="<?= e($zagolovok) ?>" />
<meta property="og:description" content="<?= e($opisanie) ?>" />
<meta property="og:url" content="<?= e($kanon) ?>" />
<meta property="og:locale" content="ru_RU" />
<?php if ($ogKartinka): ?><meta property="og:image" content="<?= e($ogKartinka) ?>" />
<?php endif; ?>
<link rel="icon" href="<?= e(put('/favicon.svg')) ?>" type="image/svg+xml" />

<?php // Шрифты лежат рядом с сайтом: с Google Fonts они шли неровно, а при
      // недоступности страница меняла вид на системный шрифт. Кириллица и
      // латиница подгружаются заранее — ими набрано всё, что видно сразу. ?>
<link rel="preload" href="<?= e(put('/fonts/rubik-cyrillic.woff2')) ?>" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="<?= e(put('/fonts/onest-cyrillic.woff2')) ?>" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="<?= e(put('/fonts/shrifty.css')) ?>" />
<link rel="stylesheet" href="<?= e(put('/statika/sayt.css')) ?>" />

<!-- Место под счётчик Яндекс.Метрики. Идентификатора нет, счётчик не подключён. -->
<?= $o['golova'] ?? '' ?>
</head>
<body>
<?= blob_opredeleniya() ?>
<a class="propustit" href="#glavnoe">Перейти к содержимому</a>
<?= shapka($shapkaSFonom) ?>
<main id="glavnoe">
<?php
}

/** Конец страницы: футер, сквозные слои и скрипты. */
function stranica_konec(array $skripty = []): void
{
    ?></main>
<?= futer() ?>
<?= panel_zakaza() ?>
<?= mobilnoe_menyu() ?>
<script type="module" src="<?= e(put('/statika/vydvizhnaya.js')) ?>"></script>
<?php foreach ($skripty as $imya): ?>
<script type="module" src="<?= e(put("/statika/{$imya}.js")) ?>"></script>
<?php endforeach; ?>
</body>
</html>
<?php
}

/** Микроразметка. Отдаётся строкой в раздел head. */
function shema(array $dannye): string
{
    return '<script type="application/ld+json">'
        . json_encode($dannye, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
}
