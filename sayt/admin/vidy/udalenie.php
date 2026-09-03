<?php
// Удаление в два шага. Если позиция входит в состав сетов, нужно ещё одно
// подтверждение: состав сета останется со ссылкой на несуществующее блюдо.

declare(strict_types=1);

/** @var array $blyudo */
/** @var array $sety названия сетов, где упоминается позиция */

admin_nachalo('Удаление позиции');
?>
<h1>Удалить «<?= e($blyudo['name']) ?>»?</h1>

<?php if ($sety): ?>
  <?= soobshchenie(
      '<strong>Эта позиция входит в состав сетов:</strong><ul><li>'
      . implode('</li><li>', array_map('e', $sety))
      . '</li></ul>После удаления в составе этих сетов останется строка с её названием, '
      . 'но самой позиции в меню не будет. Проверьте сеты после удаления.',
      'oshibka',
  ) ?>
<?php endif; ?>

<p>
  Позиция исчезнет из каталога и с главной страницы, её страница станет недоступна.
  Прежнее меню сохранится в резервной копии — восстановить можно, вернув файл
  из папки <code>dannye/kopii</code>.
</p>

<form method="post" action="<?= e(put('/admin/?d=udalit')) ?>">
  <input type="hidden" name="token" value="<?= e(tokenForm()) ?>" />
  <input type="hidden" name="id" value="<?= e($blyudo['id']) ?>" />
  <input type="hidden" name="podtverzhdeno" value="1" />

  <?php if ($sety): ?>
    <div class="pole">
      <label class="pereklyuchatel">
        <input type="checkbox" name="ponimayu_pro_sety" value="1" required />
        Понимаю, что позиция входит в сеты, и всё равно удаляю
      </label>
    </div>
  <?php endif; ?>

  <div class="knopki">
    <button class="knopka knopka--opasnaya" type="submit">Да, удалить</button>
    <a class="knopka knopka--vtoraya"
       href="<?= e(put('/admin/?d=pravka&id=' . rawurlencode($blyudo['id']))) ?>">Отмена</a>
  </div>
</form>
<?php
admin_konec();
