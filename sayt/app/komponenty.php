<?php
// Части страниц: шапка, футер, кнопки, карточки, дудлы, блобы.
// Перенос компонентов прежней сборки — разметка и классы те же, поэтому
// стили из sayt.css подходят без правок.

declare(strict_types=1);

require_once __DIR__ . '/konfig.php';
require_once __DIR__ . '/menu.php';
require_once __DIR__ . '/kafe.php';
require_once __DIR__ . '/grafika.php';

/**
 * Фирменный дудл. Обводка не масштабируется, поэтому линия остаётся
 * одинаковой толщины и на 22, и на 128 пикселях.
 */
function dudl(string $imya, int $razmer = 56, ?string $cvet = null, string $klass = ''): string
{
    $puti = DUDLY[$imya] ?? DUDLY['butylka'];
    $d = '';
    foreach ($puti as $p) {
        $d .= '<path d="' . e($p) . '" vector-effect="non-scaling-stroke" />';
    }
    // У бутылки на этикетке написано «MILK» — это часть фирменного рисунка.
    if ($imya === 'butylka') {
        $d .= '<text class="dudl__nadpis" x="24" y="28.4" text-anchor="middle" font-size="6.2"'
            . ' font-weight="700" letter-spacing="0.5" fill="currentColor" stroke="none">MILK</text>';
    }
    return '<svg class="dudl ' . e($klass) . '" width="' . $razmer . '" height="' . $razmer . '"'
        . ' viewBox="0 0 48 48" fill="none" stroke="' . e($cvet ?? 'currentColor') . '"'
        . ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
        . ' vector-effect="non-scaling-stroke" aria-hidden="true" focusable="false">' . $d . '</svg>';
}

/** Определения блоб-масок. Выводятся один раз на страницу, дальше на них ссылаются. */
function blob_opredeleniya(): string
{
    $defs = '';
    foreach (FORMY_BLOBA as $i => $d) {
        $nomer = $i + 1;
        $defs .= '<clipPath id="blob-' . $nomer . '" clipPathUnits="objectBoundingBox">'
            . '<path d="' . e($d) . '" /></clipPath>';
    }
    return '<svg class="blob-opredeleniya" aria-hidden="true" focusable="false" width="0" height="0">'
        . '<defs>' . $defs . '</defs></svg>';
}

/** Волна-разделитель между секциями. */
function volna(string $cvet, string $klass = '', bool $vniz = false): string
{
    $klassy = 'volna' . ($klass ? ' ' . $klass : '') . ($vniz ? ' volna--vniz' : '');
    return '<div class="' . e($klassy) . '" aria-hidden="true">'
        . '<svg viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">'
        . '<path d="M0,44 C160,10 320,8 480,34 C640,60 800,74 960,56 C1100,40 1240,18 1440,36 L1440,80 L0,80 Z"'
        . ' fill="' . e($cvet) . '" /></svg></div>';
}

/**
 * Кнопка сайта. Со ссылкой выводится ссылкой, без неё — кнопкой:
 * панель «Заказать» открывается кнопкой, а «Смотреть меню» ведёт на страницу.
 */
function knopka(string $tekst, array $o = []): string
{
    $vid = $o['vid'] ?? 'glavnaya';
    $klassy = ['knopka', "knopka--{$vid}"];
    if (!empty($o['klass'])) { $klassy[] = $o['klass']; }
    if (!empty($o['naVsyuShirinu'])) { $klassy[] = 'knopka--shirokaya'; }

    $atributy = '';
    foreach ($o['atributy'] ?? [] as $imya => $znachenie) {
        $atributy .= ' ' . $imya . '="' . e((string) $znachenie) . '"';
    }

    $vnutri = '<span class="knopka__tekst">' . e($tekst) . '</span>';
    if (!empty($o['adres'])) {
        $cel = !empty($o['target']) ? ' target="' . e($o['target']) . '" rel="noopener"' : '';
        return '<a class="' . e(implode(' ', $klassy)) . '" href="' . e($o['adres']) . '"'
            . $cel . $atributy . '>' . $vnutri . '</a>';
    }
    return '<button class="' . e(implode(' ', $klassy)) . '" type="' . e($o['tip'] ?? 'button') . '"'
        . $atributy . '>' . $vnutri . '</button>';
}

/** Метка на карточке: «Хит», «Острое», «Детское», «Добавка», «Нет в наличии». */
function metka(string $vid): string
{
    $podpis = $vid === 'net-v-nalichii' ? 'Нет в наличии' : (NAZVANIYA_METOK[$vid] ?? $vid);
    return '<span class="metka metka--' . e($vid) . ' metka-tekst">' . e($podpis) . '</span>';
}

/** Дудл заглушки подбирается по категории, чтобы пустые карточки не были одинаковыми. */
const DUDL_KATEGORII = [
    'zavtraki' => 'vaflya', 'sety' => 'roll', 'rolly-holodnye' => 'roll', 'rolly-tempura' => 'roll',
    'rolly-zapechennye' => 'roll', 'detskie-rolly' => 'roll', 'picca' => 'pirog', 'pasta' => 'pirog',
    'supy-salaty' => 'chashka', 'goryachee-zakuski' => 'pirog', 'deserty' => 'pechene',
    'kofe-napitki' => 'chashka',
];

/** Фотография блюда либо фирменная заглушка, если снимка нет. */
function foto_blyuda(array $blyudo, array $o = []): string
{
    $nomer = $o['nomer'] ?? 0;
    $vid = $o['vid'] ?? 'kvadrat';
    $prioritet = !empty($o['prioritet']);
    $klass = $o['klass'] ?? '';
    $forma = ($nomer % 4) + 1;
    $kadr = kartinka($blyudo);
    $alt = altBlyuda($blyudo);
    $lenivo = $prioritet ? 'eager' : 'lazy';
    $vazhno = $prioritet ? ' fetchpriority="high"' : '';
    $stil = ' style="--forma: url(#blob-' . $forma . ')"';

    if ($kadr && $vid === 'kvadrat') {
        $k = $kadr['kvadrat'];
        return '<picture class="foto ' . e($klass) . '"' . $stil . '>'
            . '<source type="image/webp" srcset="' . e($k['webp320']) . ' 320w, ' . e($k['webp540']) . ' 540w"'
            . ' sizes="(min-width: 1024px) 296px, (min-width: 768px) 33vw, 44vw" />'
            . '<img src="' . e($k['jpg']) . '" alt="' . e($alt) . '" width="' . $k['width'] . '"'
            . ' height="' . $k['height'] . '" loading="' . $lenivo . '"' . $vazhno . ' />'
            . '</picture>';
    }
    if ($kadr) {
        $k = $kadr['bolshoe'];
        return '<picture class="foto foto--bolshoe ' . e($klass) . '"' . $stil . '>'
            . '<source type="image/webp" srcset="' . e($k['webp']) . '" />'
            . '<img src="' . e($k['jpg']) . '" alt="' . e($alt) . '" width="' . $k['width'] . '"'
            . ' height="' . $k['height'] . '" loading="' . $lenivo . '"' . $vazhno . ' />'
            . '</picture>';
    }

    $naklon = [-8, 6, -4, 9][$nomer % 4];
    $imyaDudla = DUDL_KATEGORII[$blyudo['category']] ?? 'butylka';
    $klassyZaglushki = 'foto foto--zaglushka' . ($vid === 'bolshoe' ? ' foto--bolshoe' : '')
        . ($klass ? ' ' . $klass : '');
    return '<div class="' . e($klassyZaglushki) . '"'
        . ' style="--forma: url(#blob-' . $forma . '); --naklon: ' . $naklon . 'deg"'
        . ' role="img" aria-label="' . e($blyudo['name'] . ' — фотографии пока нет') . '">'
        . dudl($imyaDudla, 128, 'var(--coffee-deep)') . '</div>';
}

/** Лайфстайл-кадр: интерьер, банкеты, десерты. Их можно ставить широко. */
function foto_layf(string $imya, array $o = []): string
{
    $f = foto($imya);
    $vBlobe = !empty($o['vBlobe']);
    $nomer = $o['nomer'] ?? 0;
    $forma = ($nomer % 4) + 1;
    $klass = $o['klass'] ?? '';
    $sizes = $o['sizes'] ?? '(min-width: 1024px) 50vw, 100vw';
    $prioritet = !empty($o['prioritet']);
    $alt = $o['alt'] ?? $f['alt'];

    $klassy = 'layf' . ($klass ? ' ' . $klass : '') . ($vBlobe ? ' layf--blob' : '');
    $stil = $vBlobe ? ' style="--forma: url(#blob-' . $forma . ')"' : '';
    $webp = $f['webp'];
    $jpg = $f['jpg'];
    return '<picture class="' . e($klassy) . '"' . $stil . '>'
        . '<source type="image/webp" srcset="' . e($webp(480)) . ' 480w, ' . e($webp(960)) . ' 960w, '
        . e($webp(1280)) . ' 1280w" sizes="' . e($sizes) . '" />'
        . '<img src="' . e($jpg(960)) . '" alt="' . e($alt) . '" width="' . $f['width'] . '"'
        . ' height="' . $f['height'] . '" loading="' . ($prioritet ? 'eager' : 'lazy') . '"'
        . ($prioritet ? ' fetchpriority="high"' : '') . ' />'
        . '</picture>';
}

/** Карточка блюда для каталога и лент. */
function kartochka_blyuda(array $blyudo, int $nomer = 0, bool $prioritet = false): string
{
    $metki = '';
    if (!empty($blyudo['badges']) || empty($blyudo['available'])) {
        $metki = '<div class="kartochka__metki">';
        if (empty($blyudo['available'])) { $metki .= metka('net-v-nalichii'); }
        foreach ($blyudo['badges'] as $b) { $metki .= metka($b); }
        $metki .= '</div>';
    }
    $staraya = '';
    if (!empty($blyudo['oldPrice'])) {
        $staraya = '<span class="kartochka__staraya melkiy priglushenno">'
            . '<span class="tolko-dlya-chteniya">Старая цена</span>'
            . e(cena((int) $blyudo['oldPrice'])) . '</span>';
    }
    return '<article class="kartochka' . (empty($blyudo['available']) ? ' kartochka--net' : '') . '">'
        . '<a class="kartochka__ssylka" href="' . e(put("/menu/{$blyudo['id']}")) . '">'
        . '<div class="kartochka__foto">'
        . foto_blyuda($blyudo, ['nomer' => $nomer, 'prioritet' => $prioritet])
        . $metki . '</div>'
        . '<h3 class="kartochka__nazvanie">' . e($blyudo['name']) . '</h3>'
        . '<p class="kartochka__sostav melkiy priglushenno">' . e($blyudo['description']) . '</p>'
        . '<div class="kartochka__niz">'
        . '<span class="kartochka__ves melkiy priglushenno">' . e($blyudo['weight'] ?? '') . '</span>'
        . '<p class="kartochka__ceny">' . $staraya
        . '<span class="kartochka__cena">' . e(cena((int) $blyudo['price'], estDobavka($blyudo))) . '</span>'
        . '</p></div></a></article>';
}

/**
 * Стрелка прокрутки горизонтальной ленты. Рисуется той же тонкой обводкой,
 * что и дудлы: сторонние наборы иконок в этот дизайн не подмешиваются.
 */
function strelka_lenty(string $storona): string
{
    $podpisi = ['nazad' => 'Прокрутить влево', 'vpered' => 'Прокрутить вправо'];
    $d = $storona === 'nazad' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7';
    return '<button class="strelka-lenty strelka-lenty--' . e($storona) . '" type="button"'
        . ' data-lenta-strelka="' . e($storona) . '" aria-label="' . e($podpisi[$storona]) . '" hidden>'
        . '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        . ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
        . ' focusable="false"><path d="' . $d . '" /></svg></button>';
}
