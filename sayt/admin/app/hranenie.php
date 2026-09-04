<?php
// Проверка и сохранение меню.
//
// Запись идёт во временный файл и переименованием: сбой посреди записи
// оставил бы menu.json обрезанным, а сайт — без меню. Переименование в
// пределах одной файловой системы происходит целиком либо не происходит.

declare(strict_types=1);

require_once __DIR__ . '/../../app/menu.php';

/** Сколько последних резервных копий хранить. */
const KOPIJ_HRANIT = 30;

/** Допустимые метки. Произвольный текст в это поле попасть не должен. */
const DOPUSTIMYE_METKI = ['hit', 'ostroe', 'detskoe', 'dobavka'];

/** Допустимые точки обрезки квадрата. */
const DOPUSTIMYE_CROP = ['top', 'center', 'bottom'];

/**
 * Проверяет позицию перед записью. Возвращает список ошибок на русском;
 * пустой список означает, что данные годны.
 *
 * @param array $pozicii все позиции — нужны для проверки id на уникальность
 */
function proverit_poziciyu(array $p, array $pozicii, ?string $prezhniyId = null): array
{
    $oshibki = [];

    $id = trim((string) ($p['id'] ?? ''));
    if ($id === '') {
        $oshibki[] = 'Не заполнен идентификатор позиции.';
    } elseif (!preg_match('~^[a-z0-9-]+$~', $id)) {
        $oshibki[] = 'Идентификатор может состоять только из латинских букв, цифр и дефисов.';
    } else {
        foreach ($pozicii as $chuzhaya) {
            if ($chuzhaya['id'] === $id && $chuzhaya['id'] !== $prezhniyId) {
                $oshibki[] = "Позиция с идентификатором «{$id}» уже есть в меню.";
                break;
            }
        }
    }

    if (trim((string) ($p['name'] ?? '')) === '') {
        $oshibki[] = 'Не заполнено название.';
    }

    $kategorii = array_column(kategorii(), 'id');
    if (!in_array($p['category'] ?? '', $kategorii, true)) {
        $oshibki[] = 'Категория не выбрана или её нет в списке.';
    }

    // Цена приходит строкой из формы, поэтому проверяется как число.
    $cena = $p['price'] ?? '';
    if (!is_numeric($cena) || (int) $cena <= 0) {
        $oshibki[] = 'Цена должна быть числом больше нуля.';
    } elseif ((int) $cena > 1000000) {
        $oshibki[] = 'Цена выглядит ошибочной: больше миллиона рублей.';
    }

    $staraya = $p['oldPrice'] ?? null;
    if ($staraya !== null && $staraya !== '') {
        if (!is_numeric($staraya) || (int) $staraya <= 0) {
            $oshibki[] = 'Старая цена должна быть числом больше нуля или пустой.';
        } elseif (is_numeric($cena) && (int) $staraya <= (int) $cena) {
            $oshibki[] = 'Старая цена должна быть больше текущей — иначе скидка не имеет смысла.';
        }
    }

    foreach ((array) ($p['badges'] ?? []) as $metka) {
        if (!in_array($metka, DOPUSTIMYE_METKI, true)) {
            $oshibki[] = "Недопустимая метка: «{$metka}».";
        }
    }

    if (!in_array($p['crop'] ?? 'center', DOPUSTIMYE_CROP, true)) {
        $oshibki[] = 'Недопустимая точка обрезки снимка.';
    }

    if (mb_strlen((string) ($p['description'] ?? '')) > 500) {
        $oshibki[] = 'Состав длиннее 500 символов — он не поместится на карточку.';
    }

    return $oshibki;
}

/** Приводит данные формы к виду, в котором они лежат в menu.json. */
function sobrat_poziciyu(array $forma, ?array $prezhnyaya = null): array
{
    $staraya = trim((string) ($forma['oldPrice'] ?? ''));
    // Адрес обычно подставляет форма при вводе названия. Если скрипт не
    // отработал, он приходит пустым — тогда адрес делается здесь, из того
    // же названия и по той же таблице, а не выдаётся ошибка на ровном месте.
    // Только для новой позиции: у существующей пустое поле означает, что его
    // очистили, и подставлять адрес молча нельзя — на прежний уже есть ссылки.
    $adres = trim((string) ($forma['id'] ?? ''));
    if ($adres === '' && $prezhnyaya === null) {
        $adres = v_identifikator(trim((string) ($forma['name'] ?? '')));
    }
    $pozicija = [
        'id' => $adres,
        'category' => (string) ($forma['category'] ?? ''),
        'name' => trim((string) ($forma['name'] ?? '')),
        'description' => trim((string) ($forma['description'] ?? '')),
        'weight' => trim((string) ($forma['weight'] ?? '')),
        'price' => (int) ($forma['price'] ?? 0),
        'oldPrice' => $staraya === '' ? null : (int) $staraya,
        'image' => $prezhnyaya['image'] ?? null,
        'crop' => (string) ($forma['crop'] ?? 'center'),
        'badges' => array_values(array_intersect(
            (array) ($forma['badges'] ?? []),
            DOPUSTIMYE_METKI,
        )),
        'available' => !empty($forma['available']),
    ];
    // Состав сета правится отдельно и приходит строками по одной в строке.
    if (isset($forma['setItems'])) {
        $stroki = array_values(array_filter(array_map(
            'trim',
            preg_split('~\R~u', (string) $forma['setItems']) ?: [],
        ), static fn($s) => $s !== ''));
        if ($stroki) { $pozicija['setItems'] = $stroki; }
    } elseif (!empty($prezhnyaya['setItems'])) {
        $pozicija['setItems'] = $prezhnyaya['setItems'];
    }
    return $pozicija;
}

/** Кто ссылается на позицию в составе сетов. */
function gde_upominaetsya(array $blyudo): array
{
    $imya = mb_strtolower($blyudo['name']);
    $nashli = [];
    foreach (blyuda() as $b) {
        foreach ($b['setItems'] ?? [] as $roll) {
            if (mb_strtolower(trim($roll)) === $imya) {
                $nashli[] = $b['name'];
                break;
            }
        }
    }
    return $nashli;
}

/** Резервная копия текущего файла с меткой времени. */
function sdelat_kopiyu(): ?string
{
    if (!is_file(FAJL_MENYU)) { return null; }
    if (!is_dir(PAPKA_KOPIJ)) { @mkdir(PAPKA_KOPIJ, 0755, true); }
    $imya = PAPKA_KOPIJ . '/menu-' . date('Y-m-d_H-i-s') . '.json';
    if (!@copy(FAJL_MENYU, $imya)) {
        throw new RuntimeException('Не удалось сделать резервную копию — сохранение отменено.');
    }
    // Старые копии удаляются, чтобы папка не росла без предела.
    $vse = glob(PAPKA_KOPIJ . '/menu-*.json') ?: [];
    sort($vse);
    foreach (array_slice($vse, 0, max(0, count($vse) - KOPIJ_HRANIT)) as $lishnyaya) {
        @unlink($lishnyaya);
    }
    return $imya;
}

/**
 * Записывает меню целиком: сперва копия, потом временный файл, потом
 * переименование. Порядок важен — копия делается до того, как что-то
 * меняется на диске.
 */
function sohranit_menyu(array $menyu): void
{
    sdelat_kopiyu();

    $tekst = json_encode(
        $menyu,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
    );
    if ($tekst === false) {
        throw new RuntimeException('Не удалось собрать JSON: ' . json_last_error_msg());
    }
    // PHP отступает четырьмя пробелами, а файл всегда был с двумя. Без этого
    // первое же сохранение переписало бы все 1800 строк и любое сравнение
    // версий утонуло бы в шуме.
    $tekst = preg_replace_callback(
        '~^(?: {4})+~m',
        static fn($s) => str_repeat('  ', (int) (strlen($s[0]) / 4)),
        $tekst,
    ) ?? $tekst;

    $vremennyy = FAJL_MENYU . '.tmp' . bin2hex(random_bytes(4));
    if (@file_put_contents($vremennyy, $tekst . "\n", LOCK_EX) === false) {
        throw new RuntimeException('Нет прав на запись в папку данных.');
    }
    // Проверяем записанное перед подменой: лучше остановиться сейчас,
    // чем оставить сайт с испорченным меню.
    $proverka = json_decode((string) file_get_contents($vremennyy), true);
    if (!is_array($proverka) || count($proverka['items'] ?? []) !== count($menyu['items'])) {
        @unlink($vremennyy);
        throw new RuntimeException('Записанный файл не читается обратно — изменения отменены.');
    }
    if (!@rename($vremennyy, FAJL_MENYU)) {
        @unlink($vremennyy);
        throw new RuntimeException('Не удалось заменить menu.json.');
    }
}

/** Читает меню заново, минуя запоминание в menu(): нужно после записи. */
function menyu_svezhee(): array
{
    $dannye = json_decode((string) file_get_contents(FAJL_MENYU), true);
    if (!is_array($dannye)) {
        throw new RuntimeException('menu.json не читается.');
    }
    return $dannye;
}

/** Транслитерация названия в идентификатор: «Сет «Хит №1»» → «set-hit-1». */
function v_identifikator(string $nazvanie): string
{
    $karta = [
        'а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'yo','ж'=>'zh','з'=>'z',
        'и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r',
        'с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'c','ч'=>'ch','ш'=>'sh','щ'=>'sch',
        'ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya',
    ];
    $stroka = mb_strtolower(trim($nazvanie));
    $stroka = strtr($stroka, $karta);
    $stroka = preg_replace('~[^a-z0-9]+~u', '-', $stroka) ?? '';
    return trim($stroka, '-');
}

/** Свободный идентификатор: к занятому добавляется номер. */
function svobodnyy_identifikator(string $osnova, array $pozicii): string
{
    $zanyatye = array_column($pozicii, 'id');
    if ($osnova === '') { $osnova = 'poziciya'; }
    if (!in_array($osnova, $zanyatye, true)) { return $osnova; }
    for ($n = 2; $n < 100; $n++) {
        if (!in_array("{$osnova}-{$n}", $zanyatye, true)) { return "{$osnova}-{$n}"; }
    }
    return $osnova . '-' . bin2hex(random_bytes(2));
}
