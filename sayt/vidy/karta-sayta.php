<?php
// Карта сайта. Собирается на лету, как и остальные страницы: позиции меню
// правит админка, и заранее записанный файл разошёлся бы с каталогом уже
// после первого добавления блюда.

declare(strict_types=1);

header('Content-Type: application/xml; charset=UTF-8');

$adresa = [
    ['put' => '/', 'vazhnost' => '1.0'],
    ['put' => '/menu', 'vazhnost' => '0.9'],
];
foreach (blyuda() as $b) {
    $adresa[] = ['put' => '/menu/' . $b['id'], 'vazhnost' => '0.7'];
}

// Признак свежести — время правки menu.json. Поле updated для этого не
// годится: там русская дата словами, которую владелец пишет руками, а до
// первого заполнения и вовсе заглушка.
$vremya = @filemtime(FAJL_MENYU);
$izmeneno = $vremya ? gmdate('Y-m-d', $vremya) : null;

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($adresa as $a) {
    echo "  <url>\n";
    echo '    <loc>' . e(ADRES . $a['put']) . "</loc>\n";
    if ($izmeneno !== null) { echo '    <lastmod>' . e($izmeneno) . "</lastmod>\n"; }
    echo '    <priority>' . e($a['vazhnost']) . "</priority>\n";
    echo "  </url>\n";
}
echo '</urlset>' . "\n";
