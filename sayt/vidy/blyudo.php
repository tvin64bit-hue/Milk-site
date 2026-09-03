<?php
// Страница блюда. Собирается на лету по идентификатору из адреса.

declare(strict_types=1);

require_once __DIR__ . '/../app/osnova.php';

/** @var array $parametry передаётся из index.php */
$blyudo = $parametry['blyudo'];
$kategoriya = kategoriyaPoIdent($blyudo['category']);
$kadr = kartinka($blyudo);
$dobavka = estDobavka($blyudo);
$napitok = $blyudo['category'] === 'kofe-napitki';
$sety = !empty($blyudo['setItems']);

// Блок похожих скрывается, если в категории меньше двух других позиций.
$pohozhie = izEtoyZheKategorii($blyudo);
$pokazatPohozhie = count($pohozhie) >= 2;

// У сетов вес приходит строкой вида «24 кусочка / ~630 г».
$kusochki = $obschiyVes = null;
if ($sety && !empty($blyudo['weight'])) {
    $chasti = array_map('trim', explode('/', $blyudo['weight']));
    [$kusochki, $obschiyVes] = [$chasti[0] ?? null, $chasti[1] ?? null];
}

$shema = [
    '@context' => 'https://schema.org', '@type' => 'MenuItem',
    'name' => $blyudo['name'], 'description' => $blyudo['description'],
    'offers' => ['@type' => 'Offer', 'price' => $blyudo['price'], 'priceCurrency' => 'RUB'],
];
if ($kadr) {
    $shema['image'] = rtrim(ADRES, '/') . str_replace(BAZA, '', $kadr['kvadrat']['webp540']);
}

stranica_nachalo([
    'zagolovok' => zagolovokBlyuda($blyudo),
    'opisanie' => opisanieBlyuda($blyudo),
    'kanon' => "/menu/{$blyudo['id']}",
    'ogKartinka' => $kadr ? rtrim(ADRES, '/') . str_replace(BAZA, '', $kadr['kvadrat']['webp540']) : null,
    'ogTip' => 'article',
    'shapkaSFonom' => true,
    'golova' => shema($shema),
]);
?>
<div class="konteyner blyudo">
  <nav class="kroshki melkiy" aria-label="Хлебные крошки">
    <ol>
      <li><a class="tekst-ssylka" href="<?= e(put('/')) ?>">Главная</a></li>
      <li><a class="tekst-ssylka" href="<?= e(put('/menu')) ?>">Меню</a></li>
      <li><a class="tekst-ssylka" href="<?= e(put("/menu?cat={$kategoriya['id']}")) ?>"><?= e($kategoriya['name']) ?></a></li>
      <li aria-current="page"><?= e($blyudo['name']) ?></li>
    </ol>
  </nav>

  <div class="blyudo__osnovnoy">
    <div class="blyudo__foto"><?= foto_blyuda($blyudo, ['vid' => 'bolshoe', 'prioritet' => true]) ?></div>

    <div class="blyudo__svedeniya">
      <p class="blyudo__kategoriya metka-tekst priglushenno"><?= e($kategoriya['name']) ?></p>
      <h1 class="blyudo__nazvanie"><?= e($blyudo['name']) ?></h1>

      <?php if (!empty($blyudo['badges'])): ?>
        <div class="blyudo__metki">
          <?php foreach ($blyudo['badges'] as $b) { echo metka($b); } ?>
        </div>
      <?php endif; ?>

      <?php if ($sety): ?>
        <div class="blyudo__sostav-seta">
          <h2 class="blyudo__podzagolovok">Что входит в сет</h2>
          <ul class="sostav-seta">
            <?php foreach ($blyudo['setItems'] as $roll): ?>
              <li><?= dudl('roll', 22, 'var(--coffee-deep)', 'sostav-seta__dudl') ?><span><?= e($roll) ?></span></li>
            <?php endforeach; ?>
          </ul>
          <?php $podpis = implode(' · ', array_filter([$kusochki, $obschiyVes])); ?>
          <?php if ($podpis !== ''): ?>
            <p class="blyudo__ves melkiy priglushenno"><?= e($podpis) ?></p>
          <?php endif; ?>
        </div>
      <?php else: ?>
        <p class="blyudo__sostav"><?= e($blyudo['description']) ?></p>
        <?php if (!empty($blyudo['weight'])): ?>
          <p class="blyudo__ves melkiy priglushenno"><?= e($blyudo['weight']) ?></p>
        <?php endif; ?>
      <?php endif; ?>

      <p class="blyudo__ceny">
        <?php if (!empty($blyudo['oldPrice'])): ?>
          <span class="blyudo__staraya priglushenno">
            <span class="tolko-dlya-chteniya">Старая цена</span><?= e(cena((int) $blyudo['oldPrice'])) ?>
          </span>
        <?php endif; ?>
        <span class="blyudo__cena"><?= e(cena((int) $blyudo['price'], $dobavka)) ?></span>
      </p>

      <?php if ($napitok && !$dobavka): ?>
        <p class="blyudo__dobavki melkiy priglushenno">Альтернативное молоко +70&nbsp;₽ · Сироп +20&nbsp;₽</p>
      <?php endif; ?>

      <?php if (empty($blyudo['available'])): ?>
        <p class="blyudo__net melkiy">Сейчас этой позиции нет в наличии — уточните по телефону.</p>
      <?php endif; ?>

      <div class="blyudo__zakaz">
        <?= knopka('Заказать', [
            'naVsyuShirinu' => true,
            'atributy' => ['data-otkryt' => 'zakaz', 'data-kontekst' => $blyudo['name']],
        ]) ?>
        <p class="blyudo__telefon melkiy">
          Заказ по телефону: <a class="tekst-ssylka" href="<?= e(KAFE['telefonSsylka']) ?>"><?= e(KAFE['telefon']) ?></a>
        </p>
      </div>
    </div>
  </div>

  <?php if ($pokazatPohozhie): ?>
    <section class="pohozhie">
      <h2>Из этой же категории</h2>
      <ul class="pohozhie__setka">
        <?php foreach ($pohozhie as $i => $b): ?>
          <li><?= kartochka_blyuda($b, $i) ?></li>
        <?php endforeach; ?>
      </ul>
    </section>
  <?php endif; ?>

  <p class="blyudo__nazad">
    <?= knopka('Назад в меню', [
        'vid' => 'vtoraya',
        'adres' => put("/menu?cat={$kategoriya['id']}"),
        'klass' => 'nazad-v-menyu',
        'atributy' => ['data-nazad' => ''],
    ]) ?>
  </p>
</div>
<?php
stranica_konec();
