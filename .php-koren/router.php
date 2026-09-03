<?php
// Роутер для встроенного сервера PHP: повторяет поведение .htaccess.
// Существующие файлы отдаются как есть; папка с index.php — своим index.php
// (так работает DirectoryIndex у Apache); всё остальное идёт в index.php сайта.
$put = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$fajl = __DIR__ . $put;

if ($put !== '/milk-site/' && is_file($fajl)) {
    return false;
}
if (is_dir($fajl) && is_file(rtrim($fajl, '/') . '/index.php')) {
    require rtrim($fajl, '/') . '/index.php';
    return true;
}
if (str_starts_with($put, '/milk-site')) {
    require __DIR__ . '/milk-site/index.php';
    return true;
}
http_response_code(404);
echo 'Вне сайта';
return true;
