<?php
// Единая точка входа. Все адреса приходят сюда через .htaccess и
// разбираются здесь: страница собирается на лету из dannye/menu.json.

declare(strict_types=1);

// Версия PHP проверяется до всего остального: на старой версии файлы
// с новым синтаксисом не читаются, и объяснить причину будет уже нечем.
require_once __DIR__ . '/app/versiya.php';

// Ошибки не показываются посетителю, но и не теряются: без записи в журнал
// сбой выглядит как страница, оборвавшаяся посреди разметки.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/dannye/oshibki.log');
error_reporting(E_ALL);

set_exception_handler(static function (Throwable $e): void {
    error_log('Сбой страницы: ' . $e->getMessage() . ' в ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        . '<title>Ошибка на сайте</title></head><body style="font-family:sans-serif;padding:2rem">'
        . '<h1>Что-то пошло не так</h1><p>Страница временно недоступна. '
        . 'Заказ можно сделать по телефону +7 961 362-59-43.</p></body></html>';
});

require_once __DIR__ . '/app/konfig.php';
require_once __DIR__ . '/app/menu.php';
require_once __DIR__ . '/app/kafe.php';

// Путь без подпапки сайта и без строки запроса.
$put = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if (BAZA !== '' && str_starts_with($put, BAZA)) {
    $put = substr($put, strlen(BAZA));
}
$put = '/' . trim(rawurldecode($put), '/');

// Разбор адреса. Страниц немного, поэтому обходимся без библиотеки маршрутов.
$stranica = null;
$parametry = [];

if ($put === '/') {
    $stranica = 'glavnaya';
} elseif ($put === '/sitemap.xml' || $put === '/sitemap-index.xml') {
    // Карта сайта отдаётся по обоим адресам: на первый смотрят поисковики
    // по привычке, второй записан в robots.txt со времён прежней сборки.
    $stranica = 'karta-sayta';
} elseif ($put === '/menu') {
    $stranica = 'katalog';
} elseif (preg_match('~^/menu/([a-z0-9-]+)$~', $put, $sovpadenie)) {
    $blyudo = blyudoPoId($sovpadenie[1]);
    if ($blyudo !== null) {
        $stranica = 'blyudo';
        $parametry['blyudo'] = $blyudo;
    }
}

if ($stranica === null) {
    http_response_code(404);
    $stranica = '404';
}

require __DIR__ . "/vidy/{$stranica}.php";
