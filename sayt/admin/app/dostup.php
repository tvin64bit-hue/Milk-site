<?php
// Вход в админку: хранение пароля, сессия, защита от перебора.
//
// Пароль не хранится: хранится только его хеш. Файл с хешем кладётся туда,
// куда PHP может писать и откуда его нельзя скачать, — где именно, решает
// gde_hranit_dostup() при первичной настройке.

declare(strict_types=1);

require_once __DIR__ . '/../../app/konfig.php';

/** Сколько неудачных попыток подряд разрешено до блокировки. */
const POPYTOK_DO_BLOKIROVKI = 5;
/** На сколько минут вход блокируется после исчерпания попыток. */
const MINUT_BLOKIROVKI = 15;

/**
 * Где хранить файл с хешем пароля.
 *
 * «Вне сайта» значит выше DOCUMENT_ROOT — фактического корня, который
 * Apache отдаёт браузеру. Каталог KOREN (sayt/) сам лежит внутри
 * DOCUMENT_ROOT — сайт открывается по адресу /milk-site, то есть sayt/
 * это подпапка публичной папки хостинга. Поэтому «на уровень выше KOREN»
 * может оказаться тем же DOCUMENT_ROOT или его подпапкой — всё ещё
 * доступной браузеру, а не защищённым местом. Правильная точка отсчёта —
 * DOCUMENT_ROOT из окружения сервера, и «вне сайта» — на уровень выше него.
 *
 * Если DOCUMENT_ROOT определить не удалось (запуск из командной строки,
 * нестандартная настройка), безопасный внешний путь неизвестен, и остаётся
 * только защищённая .htaccess папка данных со случайным именем файла.
 */
function gde_hranit_dostup(): array
{
    // realpath разворачивает симлинки: без этого DOCUMENT_ROOT,
    // подключённый через ссылку (так бывает при добавлении домена панелью
    // хостинга), даёт разные dirname() в зависимости от того, как именно
    // PHP увидел путь при подключении файла.
    $koren = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($koren !== '') {
        $koren = realpath($koren) ?: rtrim(str_replace('\\', '/', $koren), '/');
        $vne = dirname($koren) . '/milk-dostup';
        // На уровень выше DOCUMENT_ROOT надёжно вне зоны, которую отдаёт
        // веб-сервер, — в отличие от родителя KOREN, который мог совпасть
        // с самим DOCUMENT_ROOT.
        if (dirname($koren) !== $koren && (@mkdir($vne, 0700, true) || is_dir($vne))) {
            $proba = $vne . '/.proba';
            if (@file_put_contents($proba, 'x') !== false) {
                @unlink($proba);
                return ['papka' => $vne, 'vne_sayta' => true];
            }
        }
    }
    return ['papka' => KOREN . '/dannye', 'vne_sayta' => false];
}

/** Путь к файлу с хешем, если настройка уже пройдена. */
function fajl_dostupa(): ?string
{
    $koren = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $koren = $koren !== '' ? (realpath($koren) ?: rtrim(str_replace('\\', '/', $koren), '/')) : '';
    $vne = $koren !== '' ? dirname($koren) . '/milk-dostup' : null;
    foreach (array_filter([$vne, KOREN . '/dannye']) as $papka) {
        $najdennye = glob($papka . '/dostup-*.php') ?: [];
        if ($najdennye) { return $najdennye[0]; }
    }
    return null;
}

function nastroyka_proydena(): bool { return fajl_dostupa() !== null; }

/** Читает сохранённые учётные данные. */
function dannye_dostupa(): ?array
{
    $fajl = fajl_dostupa();
    if ($fajl === null) { return null; }
    $dannye = require $fajl;
    return is_array($dannye) ? $dannye : null;
}

/** Сохраняет логин и хеш пароля. Пароль в открытом виде никуда не пишется. */
function sohranit_dostup(string $login, string $parol): string
{
    $mesto = gde_hranit_dostup();
    // Случайная часть в имени: если файл всё же окажется в папке сайта,
    // его нельзя будет запросить наугад.
    $fajl = $mesto['papka'] . '/dostup-' . bin2hex(random_bytes(16)) . '.php';

    $soderzhimoe = "<?php\n// Учётные данные админки. Пароль здесь не хранится — только его хеш.\n"
        . "// Забыли пароль: удалите этот файл, и страница первичной настройки откроется снова.\n"
        . 'return ' . var_export([
            'login' => $login,
            'hesh' => password_hash($parol, PASSWORD_DEFAULT),
            'sozdan' => date('c'),
        ], true) . ";\n";

    if (file_put_contents($fajl, $soderzhimoe, LOCK_EX) === false) {
        throw new RuntimeException('Не удалось сохранить файл доступа: ' . $fajl);
    }
    @chmod($fajl, 0600);
    return $fajl;
}

/** Меняет пароль, не трогая логин. */
function smenit_parol(string $novyy): void
{
    $dannye = dannye_dostupa();
    if ($dannye === null) { throw new RuntimeException('Настройка не пройдена'); }
    $staryy = fajl_dostupa();
    sohranit_dostup($dannye['login'], $novyy);
    if ($staryy !== null) { @unlink($staryy); }
}

// ---- Сессия и защита от перебора --------------------------------------

function nachat_sessiyu(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) { return; }
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => BAZA . '/',
        'httponly' => true,
        // Куки только по HTTPS, если сайт открыт по нему.
        'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Lax',
    ]);
    session_name('milk_admin');
    session_start();
}

function voshel(): bool
{
    nachat_sessiyu();
    return !empty($_SESSION['vhod']);
}

/** Журнал попыток входа. Хранится рядом с данными, к сети не доступен. */
function fajl_popytok(): string { return KOREN . '/dannye/popytki.json'; }

function popytki(): array
{
    $syroe = @file_get_contents(fajl_popytok());
    $dannye = $syroe === false ? null : json_decode($syroe, true);
    return is_array($dannye) ? $dannye : ['schet' => 0, 'do' => 0];
}

/** Сколько секунд осталось до конца блокировки. Ноль — вход открыт. */
function blokirovka_ostalos(): int
{
    $p = popytki();
    return max(0, (int) ($p['do'] ?? 0) - time());
}

function zapisat_popytku(bool $udachno): void
{
    $p = popytki();
    if ($udachno) {
        @file_put_contents(fajl_popytok(), json_encode(['schet' => 0, 'do' => 0]), LOCK_EX);
        return;
    }
    $schet = (int) ($p['schet'] ?? 0) + 1;
    $do = $schet >= POPYTOK_DO_BLOKIROVKI ? time() + MINUT_BLOKIROVKI * 60 : 0;
    // После блокировки счёт обнуляется, иначе каждая следующая ошибка
    // блокировала бы вход мгновенно и навсегда.
    @file_put_contents(
        fajl_popytok(),
        json_encode(['schet' => $do ? 0 : $schet, 'do' => $do]),
        LOCK_EX,
    );
}

/** Проверяет логин и пароль. Сравнение хеша устойчиво к подбору по времени. */
function proverit_vhod(string $login, string $parol): bool
{
    $dannye = dannye_dostupa();
    if ($dannye === null) { return false; }
    $loginVerno = hash_equals($dannye['login'], $login);
    $parolVerno = password_verify($parol, $dannye['hesh']);
    return $loginVerno && $parolVerno;
}

function vpustit(): void
{
    nachat_sessiyu();
    // Новый идентификатор сессии после входа: старый мог быть подсунут.
    session_regenerate_id(true);
    $_SESSION['vhod'] = true;
    $_SESSION['vremya'] = time();
}

function vyyti(): void
{
    nachat_sessiyu();
    $_SESSION = [];
    session_destroy();
}

// ---- Защита форм от подделки запросов ---------------------------------

function tokenForm(): string
{
    nachat_sessiyu();
    if (empty($_SESSION['token'])) {
        $_SESSION['token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['token'];
}

function tokenVeren(?string $prislannyy): bool
{
    nachat_sessiyu();
    return !empty($_SESSION['token']) && is_string($prislannyy)
        && hash_equals($_SESSION['token'], $prislannyy);
}

/** Требует входа: без него до форм дела нет. */
function trebovat_vhod(): void
{
    if (!voshel()) {
        header('Location: ' . put('/admin/'));
        exit;
    }
}
