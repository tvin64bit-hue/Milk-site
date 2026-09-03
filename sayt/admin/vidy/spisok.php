<?php
// Список всех позиций по категориям. Поиск по названию работает без
// перезагрузки: позиций 91, они умещаются в разметку целиком.

declare(strict_types=1);

admin_nachalo('Список позиций');

$sohraneno = (string) ($_GET['sohraneno'] ?? '');
$udaleno = (string) ($_GET['udaleno'] ?? '');
$dataSohranena = isset($_GET['data-sohraneno']);
$dataOshibka = isset($_GET['oshibka']);
?>
<h1>Позиции меню</h1>

<?php if ($sohraneno !== '' && ($b = blyudoPoId($sohraneno))): ?>
  <?= soobshchenie('Сохранено: <strong>' . e($b['name']) . '</strong>. '
      . 'Изменение уже видно на сайте — <a href="' . e(put('/menu/' . $b['id']))
      . '" target="_blank" rel="noopener">открыть страницу</a>.') ?>
<?php endif; ?>

<?php if ($udaleno !== ''): ?>
  <?= soobshchenie('Позиция «' . e($udaleno) . '» удалена. '
      . 'Прежнее меню сохранено в резервной копии.') ?>
<?php endif; ?>

<?php if ($dataSohranena): ?>
  <?= soobshchenie('Дата актуальности цен обновлена.') ?>
<?php endif; ?>
<?php if ($dataOshibka): ?>
  <?= soobshchenie('Дата не может быть пустой.', 'oshibka') ?>
<?php endif; ?>

<form method="post" action="<?= e(put('/admin/?d=data')) ?>"
      class="pole" style="max-width:420px;margin-bottom:1.5rem">
  <input type="hidden" name="token" value="<?= e(tokenForm()) ?>" />
  <label class="pole__podpis" for="updated">Дата актуальности цен</label>
  <div style="display:flex;gap:0.6rem">
    <input id="updated" name="updated" type="text" value="<?= e(menu()['updated'] ?? '') ?>"
           placeholder="например: 3 сентября 2026" />
    <button class="knopka knopka--vtoraya" type="submit" style="white-space:nowrap">Сохранить</button>
  </div>
  <span class="pole__podskazka">Показывается подписью под каталогом на сайте.</span>
</form>

<div class="poisk-stroka">
  <input type="search" id="poisk" placeholder="Поиск по названию" autocomplete="off" />
  <span class="schetchik" id="schetchik"><?= count(blyuda()) ?> позиций в 12 категориях</span>
  <a class="knopka" href="<?= e(put('/admin/?d=novaya')) ?>">Добавить позицию</a>
</div>

<?php foreach (kategorii() as $kategoriya): ?>
  <?php $pozicii = blyudaKategorii($kategoriya['id']); ?>
  <section class="gruppa" data-gruppa>
    <h2 class="gruppa__zagolovok">
      <?= e($kategoriya['name']) ?>
      <span class="gruppa__chislo"><?= count($pozicii) ?></span>
    </h2>
    <div class="spisok">
      <?php foreach ($pozicii as $b): ?>
        <?php $kadr = kartinka($b); ?>
        <a class="strochka" data-poziciya data-imya="<?= e(mb_strtolower($b['name'])) ?>"
           href="<?= e(put('/admin/?d=pravka&id=' . rawurlencode($b['id']))) ?>">
          <?php if ($kadr): ?>
            <img class="strochka__foto" src="<?= e($kadr['kvadrat']['jpg']) ?>" alt=""
                 width="56" height="56" loading="lazy" />
          <?php else: ?>
            <span class="strochka__net-foto">нет фото</span>
          <?php endif; ?>
          <span>
            <span class="strochka__nazvanie"><?= e($b['name']) ?></span><br />
            <span class="strochka__sostav"><?= e(mb_substr($b['description'], 0, 70)) ?><?= mb_strlen($b['description']) > 70 ? '…' : '' ?></span>
          </span>
          <?php if (empty($b['available'])): ?>
            <span class="strochka__pometka">нет в наличии</span>
          <?php else: ?>
            <span></span>
          <?php endif; ?>
          <span class="strochka__cena"><?= e(cena((int) $b['price'], estDobavka($b))) ?></span>
        </a>
      <?php endforeach; ?>
    </div>
  </section>
<?php endforeach; ?>

<script>
  // Поиск прячет строки, не подходящие под запрос, и целые категории,
  // если в них ничего не осталось.
  var pole = document.getElementById('poisk');
  var schetchik = document.getElementById('schetchik');
  var strochki = [].slice.call(document.querySelectorAll('[data-poziciya]'));
  var gruppy = [].slice.call(document.querySelectorAll('[data-gruppa]'));

  pole.addEventListener('input', function () {
    var zapros = pole.value.trim().toLowerCase().replace(/ё/g, 'е');
    var vidno = 0;
    strochki.forEach(function (s) {
      var podhodit = !zapros || s.dataset.imya.replace(/ё/g, 'е').indexOf(zapros) !== -1;
      s.hidden = !podhodit;
      if (podhodit) vidno++;
    });
    gruppy.forEach(function (g) {
      g.hidden = !g.querySelector('[data-poziciya]:not([hidden])');
    });
    schetchik.textContent = zapros ? 'Найдено: ' + vidno : strochki.length + ' позиций в 12 категориях';
  });
</script>
<?php
admin_konec();
