<?php
// Мягкая заглушка в стиле бренда. Дудлы по фону статичны, без параллакса.

declare(strict_types=1);

require_once __DIR__ . '/../app/osnova.php';

$DUDLY_FONA = [
    ['imya' => 'kruassan', 'verh' => '12%', 'levo' => '8%', 'razmer' => 72],
    ['imya' => 'chashka', 'verh' => '68%', 'levo' => '5%', 'razmer' => 56],
    ['imya' => 'ponchik', 'verh' => '22%', 'levo' => '86%', 'razmer' => 64],
    ['imya' => 'vaflya', 'verh' => '74%', 'levo' => '88%', 'razmer' => 48],
    ['imya' => 'butylka', 'verh' => '46%', 'levo' => '92%', 'razmer' => 40],
];
$ogFoto = foto('neon-mesto-gde-horosho');

stranica_nachalo([
    'zagolovok' => 'Страница не найдена | Кафе «Милк», Благовещенск',
    'opisanie' => 'Такой страницы у нас нет. Зато есть 91 позиция в меню и кофе, который сварят прямо сейчас.',
    'kanon' => '/404',
    'ogKartinka' => rtrim(ADRES, '/') . str_replace(BAZA, '', ($ogFoto['jpg'])(1280)),
    'shapkaSFonom' => true,
    'golova' => '<meta name="robots" content="noindex" />',
]);
?>
<section class="oshibka">
  <div class="oshibka__dudly" aria-hidden="true">
    <?php foreach ($DUDLY_FONA as $d): ?>
      <span class="oshibka__dudl" style="top:<?= e($d['verh']) ?>; left:<?= e($d['levo']) ?>">
        <?= dudl($d['imya'], $d['razmer']) ?>
      </span>
    <?php endforeach; ?>
  </div>

  <div class="konteyner oshibka__vnutri">
    <img class="oshibka__logotip" src="<?= e(put('/images/logo/logo-dekor.webp')) ?>"
         alt="" width="240" height="182" loading="eager" />
    <h1>Кажется, это блюдо уже съели</h1>
    <p class="oshibka__tekst">
      Такой страницы у нас нет. Зато есть 91 позиция в меню и кофе, который сварят прямо сейчас.
    </p>
    <div class="oshibka__knopki">
      <?= knopka('На главную', ['adres' => put('/')]) ?>
      <?= knopka('Смотреть меню', ['vid' => 'vtoraya', 'adres' => put('/menu')]) ?>
    </div>
  </div>
</section>
<?php
stranica_konec();
