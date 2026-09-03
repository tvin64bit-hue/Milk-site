<?php
// Управление меню. Одна точка входа: разбирает действие и показывает
// нужную страницу. Пользователь один, поэтому ролей и прав здесь нет.

declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../dannye/oshibki.log');
error_reporting(E_ALL);

require_once __DIR__ . '/../app/konfig.php';
require_once __DIR__ . '/../app/menu.php';
require_once __DIR__ . '/app/dostup.php';
require_once __DIR__ . '/app/hranenie.php';
require_once __DIR__ . '/app/foto.php';
require_once __DIR__ . '/vidy/osnova.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Админка: ' . $e->getMessage() . ' в ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    admin_nachalo('Ошибка', false);
    echo '<h1>Что-то пошло не так</h1>';
    echo soobshchenie('Действие не выполнено. Подробности записаны в журнал ошибок '
        . 'на сервере: dannye/oshibki.log', 'oshibka');
    echo '<p><a class="knopka knopka--vtoraya" href="' . e(put('/admin/')) . '">Вернуться к списку</a></p>';
    admin_konec();
});

$deystvie = (string) ($_GET['d'] ?? '');
$post = $_SERVER['REQUEST_METHOD'] === 'POST';

// ---- Первичная настройка ----------------------------------------------
if (!nastroyka_proydena()) {
    if ($deystvie !== 'nastroyka') {
        header('Location: ' . put('/admin/?d=nastroyka'));
        exit;
    }
    require __DIR__ . '/vidy/nastroyka.php';
    exit;
}
// Пройденная настройка закрывает саму страницу настройки: иначе кто угодно
// сменил бы пароль, просто открыв её.
if ($deystvie === 'nastroyka') {
    header('Location: ' . put('/admin/'));
    exit;
}

// ---- Вход и выход -----------------------------------------------------
if ($deystvie === 'vyhod') {
    vyyti();
    header('Location: ' . put('/admin/'));
    exit;
}

if (!voshel()) {
    require __DIR__ . '/vidy/vhod.php';
    exit;
}

// Дальше — только для вошедших. Каждое изменяющее действие проверяет токен
// формы: без него чужая страница могла бы отправить запрос от вашего имени.
$trebuetToken = $post || in_array($deystvie, ['udalit'], true);
if ($post && !tokenVeren($_POST['token'] ?? null)) {
    http_response_code(400);
    admin_nachalo('Ошибка');
    echo soobshchenie('Форма устарела — откройте страницу заново и повторите.', 'oshibka');
    admin_konec();
    exit;
}

// ---- Смена пароля -----------------------------------------------------
if ($deystvie === 'parol') {
    require __DIR__ . '/vidy/parol.php';
    exit;
}

// ---- Дата актуальности цен ---------------------------------------------
if ($deystvie === 'data' && $post) {
    $menyu = menyu_svezhee();
    $novaya = trim((string) ($_POST['updated'] ?? ''));
    if ($novaya === '') {
        header('Location: ' . put('/admin/?d=data&oshibka=1'));
        exit;
    }
    $menyu['updated'] = $novaya;
    sohranit_menyu($menyu);
    header('Location: ' . put('/admin/?data-sohraneno=1'));
    exit;
}

// ---- Сохранение позиции ------------------------------------------------
if ($deystvie === 'sohranit' && $post) {
    $menyu = menyu_svezhee();
    $prezhniyId = trim((string) ($_POST['prezhniy_id'] ?? ''));
    $nomer = null;
    foreach ($menyu['items'] as $i => $b) {
        if ($b['id'] === $prezhniyId) { $nomer = $i; break; }
    }
    $prezhnyaya = $nomer !== null ? $menyu['items'][$nomer] : null;

    $pozicija = sobrat_poziciyu($_POST, $prezhnyaya);
    $oshibki = proverit_poziciyu($pozicija, $menyu['items'], $prezhniyId ?: null);

    // Снимок обрабатывается только если позиция прошла проверку: иначе
    // на диске остался бы файл от несохранённой позиции.
    if (!$oshibki && !empty($_FILES['snimok']['name'])) {
        try {
            $ramka = json_decode((string) ($_POST['ramka'] ?? '[]'), true) ?: [];
            $razmery = obrabotat_snimok($_FILES['snimok'], $pozicija['id'], $ramka);
            zapisat_razmery($pozicija['id'], $razmery);
            $pozicija['image'] = $pozicija['id'] . '.webp';
        } catch (RuntimeException $e) {
            $oshibki[] = $e->getMessage();
        }
    }

    if ($oshibki) {
        $blyudo = $pozicija;
        $blyudo['__oshibki'] = $oshibki;
        require __DIR__ . '/vidy/forma.php';
        exit;
    }

    if ($nomer !== null) {
        $menyu['items'][$nomer] = $pozicija;
    } else {
        $menyu['items'][] = $pozicija;
    }
    sohranit_menyu($menyu);
    header('Location: ' . put('/admin/?sohraneno=' . rawurlencode($pozicija['id'])));
    exit;
}

// ---- Удаление ----------------------------------------------------------
if ($deystvie === 'udalit') {
    $id = (string) ($_REQUEST['id'] ?? '');
    $blyudo = blyudoPoId($id);
    if ($blyudo === null) {
        header('Location: ' . put('/admin/'));
        exit;
    }
    $sety = gde_upominaetsya($blyudo);

    if ($post && !empty($_POST['podtverzhdeno'])) {
        // Второе подтверждение нужно только когда позиция входит в сеты.
        if ($sety && empty($_POST['ponimayu_pro_sety'])) {
            require __DIR__ . '/vidy/udalenie.php';
            exit;
        }
        $menyu = menyu_svezhee();
        $menyu['items'] = array_values(array_filter(
            $menyu['items'],
            static fn($b) => $b['id'] !== $id,
        ));
        sohranit_menyu($menyu);
        udalit_snimok($id);
        header('Location: ' . put('/admin/?udaleno=' . rawurlencode($blyudo['name'])));
        exit;
    }
    require __DIR__ . '/vidy/udalenie.php';
    exit;
}

// ---- Форма позиции -----------------------------------------------------
if ($deystvie === 'pravka' || $deystvie === 'novaya') {
    $blyudo = null;
    if ($deystvie === 'pravka') {
        $blyudo = blyudoPoId((string) ($_GET['id'] ?? ''));
        if ($blyudo === null) {
            header('Location: ' . put('/admin/'));
            exit;
        }
    }
    require __DIR__ . '/vidy/forma.php';
    exit;
}

// ---- Список ------------------------------------------------------------
require __DIR__ . '/vidy/spisok.php';
