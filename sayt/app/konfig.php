<?php
// Настройки сайта. Единственное место, где задан адрес и корень.
//
// Сайт лежит в подпапке домена: web-styles.ru/milk-site. Поэтому все
// внутренние ссылки и пути к файлам собираются через put() — прямой путь
// вида /menu уведёт в корень домена, мимо сайта.

declare(strict_types=1);

/** Подпапка, в которой лежит сайт. Пустая строка, если он в корне домена. */
const BAZA = '/milk-site';

/** Полный адрес сайта — для канонических ссылок, карты сайта и Open Graph. */
const ADRES = 'https://web-styles.ru' . BAZA;

/** Корень проекта на диске. */
const KOREN = __DIR__ . '/..';

/** Данные меню. Их переписывает админка, поэтому папка должна быть доступна на запись. */
const FAJL_MENYU = KOREN . '/dannye/menu.json';
const PAPKA_KOPIJ = KOREN . '/dannye/kopii';

/** Учётные данные админки. Файла нет, пока не пройдена первичная настройка. */
const FAJL_DOSTUPA = KOREN . '/dannye/dostup.php';

/**
 * Внутренняя ссылка или путь к файлу с учётом подпапки.
 * Аналог put() из прежней сборки на Astro.
 */
function put(string $adres): string
{
    if ($adres === '' || $adres === '/') {
        return BAZA . '/';
    }
    return BAZA . '/' . ltrim($adres, '/');
}

/**
 * Экранирование для вывода в HTML. Данные приходят из JSON и из форм.
 *
 * Принимает и числа: в разметке рядом с текстом попадаются цены и пороги,
 * и строгий тип строки ронял страницу на ровном месте — на сервере с
 * выключенным показом ошибок она просто обрывалась посреди HTML.
 */
function e(string|int|float|null $znachenie): string
{
    return htmlspecialchars((string) $znachenie, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
