<?php
// Форма позиции: и правка, и добавление. Различаются только заголовком
// и тем, известен ли прежний идентификатор.

declare(strict_types=1);

/** @var array|null $blyudo */
$novaya = empty($blyudo['id']) && ($deystvie ?? '') !== 'pravka';
$oshibki = $blyudo['__oshibki'] ?? [];
$prezhniyId = (string) ($_POST['prezhniy_id'] ?? ($blyudo['id'] ?? ''));
$kadr = !empty($blyudo['id']) && !empty($blyudo['image']) ? kartinka($blyudo) : null;
$sety = !empty($blyudo['setItems']) || ($blyudo['category'] ?? '') === 'sety';

admin_nachalo($novaya ? 'Новая позиция' : 'Правка позиции');
?>
<h1><?= $novaya ? 'Новая позиция' : e($blyudo['name'] ?? 'Правка') ?></h1>

<?php if ($oshibki): ?>
  <?= soobshchenie('<strong>Не сохранено:</strong><ul><li>'
      . implode('</li><li>', array_map('e', $oshibki)) . '</li></ul>', 'oshibka') ?>
<?php endif; ?>

<form method="post" enctype="multipart/form-data" class="polya"
      action="<?= e(put('/admin/?d=sohranit')) ?>" id="forma">
  <input type="hidden" name="token" value="<?= e(tokenForm()) ?>" />
  <input type="hidden" name="prezhniy_id" value="<?= e($prezhniyId) ?>" />
  <input type="hidden" name="ramka" id="ramka" value="" />

  <div class="ryad">
    <div class="pole">
      <label class="pole__podpis" for="name">Название</label>
      <input id="name" name="name" type="text" required
             value="<?= e($blyudo['name'] ?? '') ?>" />
    </div>

    <div class="pole">
      <label class="pole__podpis" for="category">Категория</label>
      <select id="category" name="category" required>
        <option value="">— выберите —</option>
        <?php foreach (kategorii() as $k): ?>
          <option value="<?= e($k['id']) ?>"
            <?= ($blyudo['category'] ?? '') === $k['id'] ? 'selected' : '' ?>>
            <?= e($k['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>
  </div>

  <div class="pole">
    <label class="pole__podpis" for="id">Адрес страницы</label>
    <input id="id" name="id" type="text" required pattern="[a-z0-9\-]+"
           value="<?= e($blyudo['id'] ?? '') ?>" />
    <span class="pole__podskazka">
      Латиницей. Подставляется из названия, но можно поправить.
      Страница будет по адресу <code><?= e(rtrim(ADRES, '/')) ?>/menu/<span id="obrazec-id"><?= e($blyudo['id'] ?? '…') ?></span></code>
    </span>
  </div>

  <div class="pole">
    <label class="pole__podpis" for="description">Состав</label>
    <textarea id="description" name="description"><?= e($blyudo['description'] ?? '') ?></textarea>
  </div>

  <?php if ($sety): ?>
    <div class="pole">
      <label class="pole__podpis" for="setItems">Что входит в сет</label>
      <textarea id="setItems" name="setItems" rows="6"><?= e(implode("\n", $blyudo['setItems'] ?? [])) ?></textarea>
      <span class="pole__podskazka">По одному наименованию в строке.</span>
    </div>
  <?php endif; ?>

  <div class="ryad">
    <div class="pole">
      <label class="pole__podpis" for="weight">Вес или объём</label>
      <input id="weight" name="weight" type="text" value="<?= e($blyudo['weight'] ?? '') ?>" />
      <span class="pole__podskazka">Например: 300 г, 350 мл, 24 кусочка / ~630 г</span>
    </div>

    <div class="pole">
      <label class="pole__podpis" for="price">Цена, ₽</label>
      <input id="price" name="price" type="number" min="1" step="1" required
             value="<?= e((string) ($blyudo['price'] ?? '')) ?>" />
    </div>

    <div class="pole">
      <label class="pole__podpis" for="oldPrice">Старая цена, ₽</label>
      <input id="oldPrice" name="oldPrice" type="number" min="1" step="1"
             value="<?= e(($blyudo['oldPrice'] ?? null) === null ? '' : (string) $blyudo['oldPrice']) ?>" />
      <span class="pole__podskazka">Пусто — если скидки нет. Покажется зачёркнутой.</span>
    </div>
  </div>

  <div class="pole">
    <span class="pole__podpis">Метки на карточке</span>
    <div class="metki">
      <?php foreach (DOPUSTIMYE_METKI as $m): ?>
        <label class="metka-vybor">
          <input type="checkbox" name="badges[]" value="<?= e($m) ?>"
            <?= in_array($m, $blyudo['badges'] ?? [], true) ? 'checked' : '' ?> />
          <?= e(NAZVANIYA_METOK[$m]) ?>
        </label>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="pole">
    <label class="pereklyuchatel">
      <input type="checkbox" name="available" value="1"
        <?= !isset($blyudo['available']) || $blyudo['available'] ? 'checked' : '' ?> />
      Есть в наличии
    </label>
    <span class="pole__podskazka">Если снять, на карточке появится метка «Нет в наличии».</span>
  </div>

  <h2>Фотография</h2>
  <div class="foto-blok">
    <?php if ($kadr): ?>
      <div class="foto-tekushchee">
        <img src="<?= e($kadr['kvadrat']['jpg']) ?>" alt="" width="140" height="140" />
        <span class="pole__podskazka">Текущий снимок. Чтобы заменить — выберите новый файл.</span>
      </div>
    <?php else: ?>
      <p class="pole__podskazka">Снимка пока нет — на сайте показывается фирменная заглушка.</p>
    <?php endif; ?>

    <div class="pole">
      <label class="pole__podpis" for="snimok">Выбрать файл</label>
      <input id="snimok" name="snimok" type="file" accept="image/jpeg,image/png,image/webp" />
      <span class="pole__podskazka">
        JPEG, PNG или WebP, не больше <?= e(razmer_slovami(deystvuyushchiy_predel())) ?>.
        После выбора появится рамка — потяните её, чтобы выбрать часть снимка.
      </span>
    </div>

    <div class="obrezka" id="obrezka">
      <div class="obrezka__ramka"><img id="polotno" class="obrezka__polotno" alt="" /></div>
      <p class="pole__podskazka">Двигайте и растягивайте рамку. В карточку попадёт то, что внутри.</p>
    </div>

    <div class="pole">
      <label class="pole__podpis" for="crop">Обрезка старого снимка</label>
      <select id="crop" name="crop">
        <?php foreach (['top' => 'Верх', 'center' => 'Центр', 'bottom' => 'Низ'] as $z => $podpis): ?>
          <option value="<?= e($z) ?>" <?= ($blyudo['crop'] ?? 'center') === $z ? 'selected' : '' ?>>
            <?= e($podpis) ?>
          </option>
        <?php endforeach; ?>
      </select>
      <span class="pole__podskazka">
        Влияет только на снимки, обработанные прежним конвейером. У загруженных здесь
        обрезка берётся из рамки.
      </span>
    </div>
  </div>

  <div class="knopki">
    <button class="knopka" type="submit">Сохранить</button>
    <a class="knopka knopka--vtoraya" href="<?= e(put('/admin/')) ?>">Отмена</a>
    <?php if (!$novaya && !empty($blyudo['id'])): ?>
      <a class="knopka knopka--opasnaya"
         href="<?= e(put('/admin/?d=udalit&id=' . rawurlencode($blyudo['id']))) ?>">Удалить</a>
    <?php endif; ?>
  </div>
</form>

<link rel="stylesheet" href="<?= e(put('/admin/statika/cropper.min.css')) ?>" />
<?php
admin_konec(['cropper.min.js', 'forma.js']);
