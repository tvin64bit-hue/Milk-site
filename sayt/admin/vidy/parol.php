<?php
// Смена пароля. Требует текущий: иначе оставленная открытой вкладка
// позволила бы сменить пароль кому угодно.

declare(strict_types=1);

$oshibki = [];
$gotovo = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dannye = dannye_dostupa();
    $tekushchiy = (string) ($_POST['tekushchiy'] ?? '');
    $novyy = (string) ($_POST['novyy'] ?? '');
    $povtor = (string) ($_POST['povtor'] ?? '');

    if (!password_verify($tekushchiy, $dannye['hesh'])) {
        $oshibki[] = 'Текущий пароль введён неверно.';
    }
    if (mb_strlen($novyy) < 10) {
        $oshibki[] = 'Новый пароль должен быть не короче десяти символов.';
    }
    if ($novyy !== $povtor) {
        $oshibki[] = 'Новые пароли не совпадают.';
    }
    if (!$oshibki) {
        smenit_parol($novyy);
        $gotovo = true;
    }
}

admin_nachalo('Смена пароля');
?>
<h1>Смена пароля</h1>

<?php if ($gotovo): ?>
  <?= soobshchenie('Пароль изменён. В следующий раз входите с новым.') ?>
  <p class="knopki"><a class="knopka" href="<?= e(put('/admin/')) ?>">К списку позиций</a></p>
<?php else: ?>
  <?php if ($oshibki): ?>
    <?= soobshchenie('<strong>Не получилось:</strong><ul><li>'
        . implode('</li><li>', array_map('e', $oshibki)) . '</li></ul>', 'oshibka') ?>
  <?php endif; ?>

  <form method="post" action="<?= e(put('/admin/?d=parol')) ?>" class="polya" style="max-width:420px">
    <input type="hidden" name="token" value="<?= e(tokenForm()) ?>" />
    <div class="pole">
      <label class="pole__podpis" for="tekushchiy">Текущий пароль</label>
      <input id="tekushchiy" name="tekushchiy" type="password" required autocomplete="current-password" />
    </div>
    <div class="pole">
      <label class="pole__podpis" for="novyy">Новый пароль</label>
      <input id="novyy" name="novyy" type="password" required minlength="10" autocomplete="new-password" />
    </div>
    <div class="pole">
      <label class="pole__podpis" for="povtor">Новый пароль ещё раз</label>
      <input id="povtor" name="povtor" type="password" required minlength="10" autocomplete="new-password" />
    </div>
    <div class="knopki">
      <button class="knopka" type="submit">Сменить</button>
      <a class="knopka knopka--vtoraya" href="<?= e(put('/admin/')) ?>">Отмена</a>
    </div>
  </form>
<?php endif; ?>
<?php
admin_konec();
