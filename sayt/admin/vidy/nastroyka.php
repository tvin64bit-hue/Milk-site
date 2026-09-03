<?php
// Первичная настройка: владелец задаёт логин и пароль. Сохраняется только
// хеш. После этого страница сама себя закрывает — index.php проверяет
// наличие файла доступа раньше всего остального.

declare(strict_types=1);

$oshibki = [];
$gotovo = false;
$mesto = gde_hranit_dostup();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim((string) ($_POST['login'] ?? ''));
    $parol = (string) ($_POST['parol'] ?? '');
    $povtor = (string) ($_POST['povtor'] ?? '');

    if (mb_strlen($login) < 3) {
        $oshibki[] = 'Логин должен быть не короче трёх символов.';
    }
    if (mb_strlen($parol) < 10) {
        $oshibki[] = 'Пароль должен быть не короче десяти символов — короткий подбирается за часы.';
    }
    if ($parol !== $povtor) {
        $oshibki[] = 'Пароли не совпадают.';
    }
    if (!$oshibki) {
        sohranit_dostup($login, $parol);
        $gotovo = true;
    }
}

admin_nachalo('Первая настройка', false);
?>
<div class="vhod">
  <h1>Первая настройка</h1>

  <?php if ($gotovo): ?>
    <?= soobshchenie('Готово. Пароль сохранён, страница настройки больше не откроется.') ?>
    <p class="knopki"><a class="knopka" href="<?= e(put('/admin/')) ?>">Войти</a></p>
  <?php else: ?>
    <?php if ($oshibki): ?>
      <?= soobshchenie('<strong>Не получилось:</strong><ul><li>'
          . implode('</li><li>', array_map('e', $oshibki)) . '</li></ul>', 'oshibka') ?>
    <?php endif; ?>

    <p class="pole__podskazka">
      Задайте логин и пароль для входа в управление меню. Пароль нигде не сохраняется
      в открытом виде — на сервер ляжет только его отпечаток, по которому пароль
      восстановить нельзя.
    </p>
    <p class="pole__podskazka">
      Файл с отпечатком будет лежать <?= $mesto['vne_sayta']
        ? '<strong>вне папки сайта</strong> — оттуда его нельзя скачать через браузер'
        : '<strong>в папке данных</strong>, закрытой от скачивания, со случайным именем' ?>.
    </p>

    <form method="post" class="polya" autocomplete="off">
      <div class="pole">
        <label class="pole__podpis" for="login">Логин</label>
        <input id="login" name="login" type="text" required minlength="3"
               value="<?= e($_POST['login'] ?? '') ?>" autocomplete="username" />
      </div>
      <div class="pole">
        <label class="pole__podpis" for="parol">Пароль</label>
        <input id="parol" name="parol" type="password" required minlength="10"
               autocomplete="new-password" />
        <span class="pole__podskazka">Не короче десяти символов.</span>
      </div>
      <div class="pole">
        <label class="pole__podpis" for="povtor">Пароль ещё раз</label>
        <input id="povtor" name="povtor" type="password" required minlength="10"
               autocomplete="new-password" />
      </div>
      <div class="knopki"><button class="knopka" type="submit">Сохранить и закрыть настройку</button></div>
    </form>
  <?php endif; ?>
</div>
<?php
admin_konec();
