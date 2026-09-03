<?php
// Обёртка страниц админки. Своя, простая: это рабочий инструмент,
// а не витрина, поэтому оформление сдержаннее сайта, но в той же палитре.

declare(strict_types=1);

function admin_nachalo(string $zagolovok, bool $sMenyu = true): void
{
    ?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title><?= e($zagolovok) ?> — управление меню «Милк»</title>
<link rel="icon" href="<?= e(put('/favicon.svg')) ?>" type="image/svg+xml" />
<link rel="stylesheet" href="<?= e(put('/admin/statika/admin.css')) ?>" />
</head>
<body>
<?php if ($sMenyu): ?>
<header class="shapka">
  <a class="shapka__nazvanie" href="<?= e(put('/admin/')) ?>">Меню «Милк»</a>
  <nav class="shapka__ssylki">
    <a href="<?= e(put('/')) ?>" target="_blank" rel="noopener">Открыть сайт</a>
    <a href="<?= e(put('/admin/?d=parol')) ?>">Сменить пароль</a>
    <a href="<?= e(put('/admin/?d=vyhod')) ?>">Выйти</a>
  </nav>
</header>
<?php endif; ?>
<main class="soderzhimoe">
<?php
}

function admin_konec(array $skripty = []): void
{
    foreach ($skripty as $s) {
        echo '<script src="' . e(put("/admin/statika/{$s}")) . '"></script>' . "\n";
    }
    ?></main>
</body>
</html>
<?php
}

/** Сообщение об удаче или ошибке. */
function soobshchenie(string $tekst, string $vid = 'horosho'): string
{
    return '<p class="soobshchenie soobshchenie--' . e($vid) . '">' . $tekst . '</p>';
}
