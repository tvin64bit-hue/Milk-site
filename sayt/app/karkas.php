<?php
// Сквозные части страниц: шапка, футер, выдвижные слои, фон первого экрана.

declare(strict_types=1);

require_once __DIR__ . '/komponenty.php';

function shapka(bool $srazuSFonom = false): string
{
    $logo = razmery()['logo']['milk'];
    $vysota = 46;
    $shirina = (int) round(($logo['width'] / $logo['height']) * $vysota);

    $punkty = '';
    foreach (NAVIGACIYA as $punkt) {
        $punkty .= '<li><a href="' . e(put($punkt['adres'])) . '">' . e($punkt['nazvanie']) . '</a></li>';
    }

    return '<header class="shapka' . ($srazuSFonom ? ' shapka--s-fonom' : '') . '" data-shapka>'
        . '<div class="shapka__vnutri konteyner">'
        . '<a class="shapka__logotip" href="' . e(put('/')) . '" aria-label="Кафе «Милк», на главную">'
        . '<img src="' . e(put('/images/logo/logo-milk.png')) . '" alt="Милк" width="' . $shirina
        . '" height="' . $vysota . '" /></a>'
        . '<nav class="shapka__navigaciya" aria-label="Основная навигация"><ul>' . $punkty . '</ul></nav>'
        . '<div class="shapka__sprava">'
        . '<a class="shapka__telefon" href="' . e(KAFE['telefonSsylka']) . '">'
        . '<span class="shapka__telefon-tekst">' . e(KAFE['telefon']) . '</span>'
        . '<svg class="shapka__telefon-znak" viewBox="0 0 24 24" width="24" height="24" fill="none"'
        . ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
        . ' role="img" aria-label="' . e('Позвонить: ' . KAFE['telefon']) . '">'
        . '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />'
        . '</svg></a>'
        . knopka('Заказать', ['klass' => 'shapka__zakaz', 'atributy' => ['data-otkryt' => 'zakaz']])
        . '<button class="shapka__burger" type="button" data-otkryt="menyu" aria-label="Открыть меню">'
        . '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"'
        . ' stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>'
        . '</button></div></div></header>';
}

function futer(): string
{
    $logo = razmery()['logo']['milk'];
    $vysota = 38;
    $shirina = (int) round(($logo['width'] / $logo['height']) * $vysota);

    $punkty = '';
    foreach (NAVIGACIYA as $punkt) {
        $punkty .= '<li><a class="futer__ssylka" href="' . e(put($punkt['adres'])) . '">'
            . e($punkt['nazvanie']) . '</a></li>';
    }

    return volna('var(--coffee-dark)')
        . '<footer class="futer"><div class="konteyner futer__setka">'
        . '<div class="futer__kolonka futer__brend">'
        . '<img class="futer__logotip" src="' . e(put('/images/logo/logo-milk-svetlyy.png')) . '"'
        . ' alt="Кафе «Милк»" width="' . $shirina . '" height="' . $vysota . '" />'
        . '<p class="futer__deskriptor melkiy">вкусная еда и кофе</p></div>'
        . '<nav class="futer__kolonka" aria-label="Навигация в подвале">'
        . '<h2 class="futer__zagolovok metka-tekst">Меню</h2>'
        . '<ul class="futer__spisok">' . $punkty . '</ul></nav>'
        . '<div class="futer__kolonka"><h2 class="futer__zagolovok metka-tekst">Контакты</h2>'
        . '<ul class="futer__spisok">'
        . '<li><a class="futer__ssylka" href="' . e(KAFE['telefonSsylka']) . '">' . e(KAFE['telefon']) . '</a></li>'
        . '<li>' . e(KAFE['adres']) . '</li></ul></div>'
        . '<div class="futer__kolonka"><h2 class="futer__zagolovok metka-tekst">Мы в сети</h2>'
        . '<ul class="futer__spisok">'
        . '<li><a class="futer__ssylka" href="' . e(KAFE['vk']) . '" target="_blank" rel="noopener">'
        . e(KAFE['vkPodpis']) . '</a></li>'
        . '<li>' . e(KAFE['rezhim']) . '</li></ul></div></div>'
        . '<div class="konteyner"><p class="futer__kopirayt melkiy">© 2026 Кафе «Милк», Благовещенск</p></div>'
        . '</footer>';
}

/** Общая основа выдвижных слоёв: панели «Заказать» и мобильного меню. */
function vydvizhnaya(string $imya, string $podpis, string $vid, string $soderzhimoe): string
{
    return '<div class="vydvizhnaya vydvizhnaya--' . e($vid) . '" data-vydvizhnaya="' . e($imya) . '"'
        . ' role="dialog" aria-modal="true" aria-label="' . e($podpis) . '" hidden>'
        . '<div class="vydvizhnaya__zatemnenie" data-zatemnenie></div>'
        . '<div class="vydvizhnaya__sloy"><div class="vydvizhnaya__korpus">'
        . '<button class="vydvizhnaya__krest" type="button" data-zakryt aria-label="Закрыть">'
        . '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"'
        . ' stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>'
        . '</button>'
        . '<div class="vydvizhnaya__soderzhimoe">' . $soderzhimoe . '</div></div>'
        . volna('var(--cream)', 'vydvizhnaya__volna')
        . '</div></div>';
}

/** Панель «Заказать». Форм отправки данных здесь нет и быть не должно. */
function panel_zakaza(): string
{
    $zagolovok = 'Заказать в «Милке»';
    $tekst = 'Мы принимаем заказы по телефону — так быстрее и точнее любой формы. '
        . 'Позвоните, назовите блюда, и мы скажем, когда всё будет готово.';

    $soderzhimoe = '<p class="panel__kontekst melkiy priglushenno" data-pole="kontekst" hidden></p>'
        . '<div class="panel__kolonki"><div class="panel__levaya">'
        . '<h3 class="panel__zagolovok" data-pole="zagolovok" data-poumolchaniyu="' . e($zagolovok) . '">'
        . e($zagolovok) . '</h3>'
        . '<a class="panel__telefon" href="' . e(KAFE['telefonSsylka']) . '">' . e(KAFE['telefon']) . '</a>'
        . '<p class="panel__tekst" data-pole="tekst" data-poumolchaniyu="' . e($tekst) . '">' . e($tekst) . '</p>'
        . '</div><div class="panel__pravaya">'
        . '<p class="panel__rezhim melkiy priglushenno">' . e(KAFE['rezhim']) . '</p>'
        . '<p class="panel__adres melkiy">'
        . dudl('metka', 20, 'var(--coffee-deep)', 'panel__dudl')
        . '<a class="tekst-ssylka" href="https://yandex.ru/maps/?text=Благовещенск, улица Седова, 113/4"'
        . ' target="_blank" rel="noopener">' . e(KAFE['adres']) . ' — самовывоз</a></p>'
        . '<p class="panel__dostavka melkiy priglushenno">Доставка по городу. При заказе от '
        . e(KAFE['dostavkaOt']) . "\u{00A0}₽ — бесплатно.</p>"
        . '<div class="panel__knopki">'
        . knopka('Смотреть меню', ['adres' => put('/menu')])
        . knopka('Написать во ВКонтакте', ['vid' => 'vtoraya', 'adres' => KAFE['vk'], 'target' => '_blank'])
        . '</div></div></div>';

    return vydvizhnaya('zakaz', 'Заказать в «Милке»', 'panel', $soderzhimoe);
}

function mobilnoe_menyu(): string
{
    $punkty = '';
    foreach (NAVIGACIYA as $i => $punkt) {
        $punkty .= '<li style="--zaderzhka: ' . ($i * 60) . 'ms">'
            . '<a href="' . e(put($punkt['adres'])) . '" data-zakryt>' . e($punkt['nazvanie']) . '</a></li>';
    }
    $soderzhimoe = '<nav class="mobmenyu__navigaciya" aria-label="Основная навигация"><ul>'
        . $punkty . '</ul></nav>'
        . '<div class="mobmenyu__niz melkiy">'
        . '<a class="mobmenyu__telefon" href="' . e(KAFE['telefonSsylka']) . '">' . e(KAFE['telefon']) . '</a>'
        . '<p class="priglushenno">' . e(KAFE['adres']) . '</p>'
        . '<p class="priglushenno">' . e(KAFE['rezhim']) . '</p>'
        . '<a class="tekst-ssylka" href="' . e(KAFE['vk']) . '" target="_blank" rel="noopener">'
        . e(KAFE['vkPodpis']) . '</a></div>';

    return vydvizhnaya('menyu', 'Меню сайта', 'menyu', $soderzhimoe);
}

/** Акварельный фон первого экрана. Пока исходника нет — запасная заливка. */
function fon_ekrana(): string
{
    $f = fonEkrana();
    if ($f === null) {
        return '<div class="fon-ekrana fon-ekrana--zapas" aria-hidden="true"></div>';
    }
    $webp = $f['webp'];
    $jpg = $f['jpg'];
    $nabor = static function (callable $put): string {
        $chasti = [];
        foreach (SHIRINY_FONA as $w) { $chasti[] = e($put($w)) . " {$w}w"; }
        return implode(', ', $chasti);
    };
    return '<picture class="fon-ekrana" data-parallaks="0.2" data-parallaks-predel="80">'
        . '<source type="image/webp" srcset="' . $nabor($webp) . '" sizes="100vw" />'
        . '<img src="' . e($jpg(1152)) . '" srcset="' . $nabor($jpg) . '" sizes="100vw" alt=""'
        . ' width="' . $f['width'] . '" height="' . $f['height'] . '"'
        . ' loading="eager" decoding="sync" fetchpriority="high" /></picture>';
}
