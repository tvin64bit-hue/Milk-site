<?php
// Форма входа. После нескольких неудачных попыток вход закрывается
// на время — это защита от перебора пароля.

declare(strict_types=1);

$oshibka = null;
$ostalos = blokirovka_ostalos();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $ostalos === 0) {
    if (!tokenVeren($_POST['token'] ?? null)) {
        $oshibka = 'Форма устарела — попробуйте ещё раз.';
    } elseif (proverit_vhod((string) ($_POST['login'] ?? ''), (string) ($_POST['parol'] ?? ''))) {
        zapisat_popytku(true);
        vpustit();
        header('Location: ' . put('/admin/'));
        exit;
    } else {
        zapisat_popytku(false);
        $ostalos = blokirovka_ostalos();
        $oshibka = $ostalos > 0
            ? 'Слишком много попыток. Вход закрыт на ' . (int) ceil($ostalos / 60) . ' мин.'
            : 'Неверный логин или пароль.';
    }
}

admin_nachalo('Вход', false);
?>
<div class="vhod">
  <h1>Управление меню</h1>

  <?php if ($oshibka): ?>
    <?= soobshchenie(e($oshibka), 'oshibka') ?>
  <?php endif; ?>

  <?php if ($ostalos > 0): ?>
    <p class="pole__podskazka">
      Попробуйте снова через <?= (int) ceil($ostalos / 60) ?> мин.
    </p>
  <?php else: ?>
    <form method="post" class="polya">
      <input type="hidden" name="token" value="<?= e(tokenForm()) ?>" />
      <div class="pole">
        <label class="pole__podpis" for="login">Логин</label>
        <input id="login" name="login" type="text" required autocomplete="username" autofocus />
      </div>
      <div class="pole">
        <label class="pole__podpis" for="parol">Пароль</label>
        <input id="parol" name="parol" type="password" required autocomplete="current-password" />
      </div>
      <div class="knopki"><button class="knopka" type="submit">Войти</button></div>
    </form>
  <?php endif; ?>
</div>
<?php
admin_konec();
