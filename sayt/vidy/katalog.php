<?php
// Каталог: 91 позиция, фильтр по 12 категориям, поиск по названию и составу.
// Все карточки выводятся сразу — фильтр только показывает и прячет,
// поэтому поисковики видят полный каталог.

declare(strict_types=1);

require_once __DIR__ . '/../app/osnova.php';

$PODZAGOLOVOK = '91 позиция: завтраки, роллы и сеты, пицца, паста, горячее, десерты и кофе. '
    . 'Заказ по телефону ' . KAFE['telefon'] . '.';

$DUDLY_SHAPKI = [
    ['imya' => 'kruassan', 'verh' => '18%', 'levo' => '6%', 'razmer' => 64],
    ['imya' => 'chashka', 'verh' => '58%', 'levo' => '14%', 'razmer' => 44],
    ['imya' => 'roll', 'verh' => '24%', 'levo' => '88%', 'razmer' => 56],
    ['imya' => 'pechene', 'verh' => '66%', 'levo' => '80%', 'razmer' => 40],
];

// Разметка Schema.org: меню целиком и позиции в нём.
$razdely = [];
foreach (kategorii() as $k) {
    $pozicii = [];
    foreach (blyudaKategorii($k['id']) as $b) {
        $pozicii[] = [
            '@type' => 'MenuItem', 'name' => $b['name'], 'description' => $b['description'],
            'offers' => ['@type' => 'Offer', 'price' => $b['price'], 'priceCurrency' => 'RUB'],
        ];
    }
    $razdely[] = ['@type' => 'MenuSection', 'name' => $k['name'], 'hasMenuItem' => $pozicii];
}
$ogFoto = foto('neon-mesto-gde-horosho');

stranica_nachalo([
    'zagolovok' => 'Меню кафе «Милк» — 91 позиция с ценами | Благовещенск',
    'opisanie' => $PODZAGOLOVOK,
    'kanon' => '/menu',
    'ogKartinka' => rtrim(ADRES, '/') . str_replace(BAZA, '', ($ogFoto['jpg'])(1280)),
    'shapkaSFonom' => true,
    'golova' => shema([
        '@context' => 'https://schema.org', '@type' => 'Menu',
        'name' => 'Меню кафе «Милк»', 'hasMenuSection' => $razdely,
    ]),
]);
?>
<div data-katalog>
  <section class="shapka-menyu">
    <div class="shapka-menyu__dudly" aria-hidden="true">
      <?php foreach ($DUDLY_SHAPKI as $d): ?>
        <span class="shapka-menyu__dudl" style="top:<?= e($d['verh']) ?>; left:<?= e($d['levo']) ?>">
          <?= dudl($d['imya'], $d['razmer']) ?>
        </span>
      <?php endforeach; ?>
    </div>
    <div class="konteyner shapka-menyu__vnutri">
      <h1>Меню</h1>
      <p class="shapka-menyu__podzagolovok"><?= e($PODZAGOLOVOK) ?></p>
    </div>
  </section>

  <div class="kategorii">
    <div class="konteyner">
      <div class="kategorii__obolochka" data-lenta-obolochka>
        <?= strelka_lenty('nazad') ?>
        <div class="kategorii__lenta" data-lenta data-prokrutka tabindex="0" role="group" aria-label="Категории меню">
          <button class="kategorii__knopka kategorii__knopka--aktivna" type="button" data-vse aria-pressed="true">
            Все <span class="kategorii__chislo"><?= count(blyuda()) ?></span>
          </button>
          <?php foreach (kategorii() as $k): ?>
            <button class="kategorii__knopka" type="button" data-kategoriya="<?= e($k['id']) ?>" aria-pressed="false">
              <?= e($k['name']) ?> <span class="kategorii__chislo"><?= kolichestvoVKategorii($k['id']) ?></span>
            </button>
          <?php endforeach; ?>
        </div>
        <?= strelka_lenty('vpered') ?>
      </div>
    </div>
  </div>

  <div class="konteyner katalog">
    <div class="katalog__poisk">
      <label class="tolko-dlya-chteniya" for="poisk">Поиск по меню</label>
      <input class="pole-poiska" id="poisk" type="search" placeholder="Найти блюдо или ингредиент"
             autocomplete="off" data-poisk />
      <p class="katalog__schetchik melkiy priglushenno" data-schetchik aria-live="polite"></p>
    </div>

    <?php foreach (kategorii() as $kategoriya): ?>
      <section class="gruppa" data-gruppa="<?= e($kategoriya['id']) ?>">
        <h2 class="gruppa__zagolovok" data-zagolovok-gruppy><?= e($kategoriya['name']) ?></h2>
        <ul class="setka">
          <?php foreach (blyudaKategorii($kategoriya['id']) as $i => $blyudo): ?>
            <li class="setka__yacheyka" data-blyudo
                data-blyudo-kategoriya="<?= e($blyudo['category']) ?>"
                data-poisk="<?= e(strokaPoiska($blyudo)) ?>">
              <?= kartochka_blyuda($blyudo, $i) ?>
            </li>
          <?php endforeach; ?>
        </ul>
      </section>
    <?php endforeach; ?>

    <div class="pusto" data-pusto hidden>
      <h2>Ничего не нашлось</h2>
      <p>Попробуйте другое слово или посмотрите всё меню целиком.</p>
      <?= knopka('Показать всё меню', ['atributy' => ['data-sbros' => '']]) ?>
    </div>

    <p class="katalog__snoska melkiy priglushenno">
      Фотографии используются в качестве рекламных материалов и могут не соответствовать
      действительности. Цены актуальны на <?= e(menu()['updated']) ?>.
    </p>
  </div>
</div>
<?php
stranica_konec(['katalog', 'lenta']);
