<?php
// Чтение и подготовка данных меню.
//
// Файл читается заново при каждом запросе — в этом смысл перехода на PHP:
// правка через админку видна сразу, без пересборки сайта. В пределах одного
// запроса результат запоминается, чтобы не разбирать JSON по десять раз.

declare(strict_types=1);

require_once __DIR__ . '/konfig.php';

/** Всё меню целиком: дата обновления, категории и позиции. */
function menu(): array
{
    static $dannye = null;
    if ($dannye !== null) {
        return $dannye;
    }
    $syroe = @file_get_contents(FAJL_MENYU);
    if ($syroe === false) {
        throw new RuntimeException('Не читается ' . FAJL_MENYU);
    }
    $razobrano = json_decode($syroe, true);
    if (!is_array($razobrano) || !isset($razobrano['items'], $razobrano['categories'])) {
        throw new RuntimeException('menu.json повреждён: нет разделов items и categories');
    }
    usort($razobrano['categories'], static fn($a, $b) => $a['order'] <=> $b['order']);
    return $dannye = $razobrano;
}

function kategorii(): array { return menu()['categories']; }
function blyuda(): array { return menu()['items']; }

/** Позиция по идентификатору или null. */
function blyudoPoId(string $id): ?array
{
    static $karta = null;
    if ($karta === null) {
        $karta = [];
        foreach (blyuda() as $b) { $karta[$b['id']] = $b; }
    }
    return $karta[$id] ?? null;
}

function kategoriyaPoIdent(string $id): ?array
{
    foreach (kategorii() as $k) {
        if ($k['id'] === $id) { return $k; }
    }
    return null;
}

function blyudaKategorii(string $id): array
{
    return array_values(array_filter(blyuda(), static fn($b) => $b['category'] === $id));
}

function kolichestvoVKategorii(string $id): int { return count(blyudaKategorii($id)); }

/** Названия меток для вывода и для программ чтения с экрана. */
const NAZVANIYA_METOK = [
    'hit' => 'Хит', 'detskoe' => 'Детское', 'ostroe' => 'Острое', 'dobavka' => 'Добавка',
];

/** Цена с неразрывным пробелом: 1999 → «1 999 ₽». Добавки выводятся с плюсом. */
function cena(int $znachenie, bool $dobavka = false): string
{
    $razryady = preg_replace('/\B(?=(\d{3})+(?!\d))/u', "\u{00A0}", (string) $znachenie);
    return ($dobavka ? '+' : '') . $razryady . "\u{00A0}₽";
}

function estDobavka(array $b): bool { return in_array('dobavka', $b['badges'] ?? [], true); }

/** Заголовок вкладки и og:title страницы блюда. */
function zagolovokBlyuda(array $b): string
{
    return "{$b['name']} — {$b['price']} ₽ | Кафе «Милк», Благовещенск";
}

/** Описание страницы блюда: состав и цена, не длиннее 160 символов. */
function opisanieBlyuda(array $b): string
{
    $ves = !empty($b['weight']) ? $b['weight'] . '. ' : '';
    $hvost = $ves . cena((int) $b['price']) . '. Заказ по телефону.';
    $zapas = 160 - mb_strlen($hvost) - 2;
    $sostav = mb_strlen($b['description']) > $zapas
        ? rtrim(mb_substr($b['description'], 0, max(1, $zapas - 1))) . '…'
        : $b['description'];
    return "{$sostav}. {$hvost}";
}

/** Осмысленный alt: название и первые слова состава. */
function altBlyuda(array $b): string
{
    $slova = mb_strtolower(trim(preg_split('/[,:.]/u', $b['description'])[0]));
    return "{$b['name']} — {$slova}";
}

/** Размеры готовых изображений, посчитанные конвейером на сборке. */
function razmery(): array
{
    static $r = null;
    if ($r === null) {
        $r = json_decode((string) @file_get_contents(KOREN . '/dannye/razmery.json'), true) ?: [];
    }
    return $r;
}

/** Пути к готовым файлам изображения. Если снимка нет — null. */
function kartinka(array $b): ?array
{
    $r = razmery()['blyuda'][$b['id']] ?? null;
    if (empty($b['image']) || !$r) { return null; }
    return [
        'kvadrat' => [
            'webp320' => put("/images/menu/{$b['id']}-kv-320.webp"),
            'webp540' => put("/images/menu/{$b['id']}-kv-540.webp"),
            'jpg' => put("/images/menu/{$b['id']}-kv-540.jpg"),
            'width' => $r['kvadrat']['width'], 'height' => $r['kvadrat']['height'],
        ],
        'bolshoe' => [
            'webp' => put("/images/menu/{$b['id']}-480.webp"),
            'jpg' => put("/images/menu/{$b['id']}-480.jpg"),
            'width' => $r['bolshoe']['width'], 'height' => $r['bolshoe']['height'],
        ],
    ];
}

/** Лайфстайл-кадр по имени: пути, размеры и готовый alt. */
function foto(string $imya): array
{
    $r = razmery()['foto'][$imya] ?? null;
    if (!$r) {
        throw new RuntimeException("Нет обработанного лайфстайл-кадра «{$imya}»");
    }
    return [
        'webp' => static fn(int $w) => put("/images/photo/{$imya}-{$w}.webp"),
        'jpg' => static fn(int $w) => put("/images/photo/{$imya}-{$w}.jpg"),
        'alt' => $r['alt'], 'width' => $r['width'], 'height' => $r['height'],
    ];
}

/** Ширины, в которых собран фон первого экрана. */
const SHIRINY_FONA = [768, 1152, 1536];

/** Фон первого экрана: пути и размеры, либо null, если исходника нет. */
function fonEkrana(): ?array
{
    $r = razmery()['heroFon'] ?? null;
    if (!$r) { return null; }
    return [
        'webp' => static fn(int $w) => put("/images/fon/hero-fon-{$w}.webp"),
        'jpg' => static fn(int $w) => put("/images/fon/hero-fon-{$w}.jpg"),
        'width' => $r['width'], 'height' => $r['height'],
    ];
}

/** Снимки чужой съёмки: в подборки на главной не идут, в каталоге остаются. */
function chuzhayaSyemka(): array
{
    static $spisok = null;
    if ($spisok === null) {
        $otchet = json_decode((string) @file_get_contents(KOREN . '/dannye/fony-otchet.json'), true) ?: [];
        $spisok = array_column($otchet['chuzhaya'] ?? [], 'id');
    }
    return $spisok;
}

function dlyaPodborki(array $spisok): array
{
    $chuzhie = chuzhayaSyemka();
    return array_values(array_filter(
        $spisok,
        static fn($b) => !empty($b['image']) && !in_array($b['id'], $chuzhie, true),
    ));
}

/** Приводит строку к виду для поиска: без регистра и без буквы ё. */
function dlyaPoiska(string $stroka): string
{
    return str_replace('ё', 'е', mb_strtolower($stroka));
}

/** Строка, по которой ищет каталог: название, состав и — у сетов — входящие роллы. */
function strokaPoiska(array $b): string
{
    return dlyaPoiska(implode(' ', array_merge([$b['name'], $b['description']], $b['setItems'] ?? [])));
}

/**
 * Похожие позиции: до четырёх из той же категории, кроме текущей.
 * Порядок псевдослучайный, но детерминированный — зерно берётся из слага,
 * иначе набор менялся бы при каждом открытии страницы.
 */
function izEtoyZheKategorii(array $blyudo, int $skolko = 4): array
{
    $sosedi = array_values(array_filter(
        blyudaKategorii($blyudo['category']),
        static fn($b) => $b['id'] !== $blyudo['id'],
    ));
    $zerno = 7;
    foreach (preg_split('//u', $blyudo['id'], -1, PREG_SPLIT_NO_EMPTY) as $simvol) {
        $zerno = ($zerno * 31 + mb_ord($simvol)) % 2147483647;
    }
    $sluchay = static function () use (&$zerno): float {
        $zerno = ($zerno * 48271) % 2147483647;
        return $zerno / 2147483647;
    };
    for ($i = count($sosedi) - 1; $i > 0; $i--) {
        $j = (int) floor($sluchay() * ($i + 1));
        [$sosedi[$i], $sosedi[$j]] = [$sosedi[$j], $sosedi[$i]];
    }
    return array_slice($sosedi, 0, $skolko);
}
