<?php
// Главная страница. Порядок блоков и все тексты — из разделов 4.1 и 10.1 ТЗ.
// Ритм фонов: молочный → молочно-розовый → молочный → тёмно-кофейный →
// молочный → молочно-розовый → молочный.

declare(strict_types=1);

require_once __DIR__ . '/../app/osnova.php';

$BEGUSHCHAYA = ['Завтраки', 'Роллы', 'Сеты', 'Пицца', 'Паста', 'Кофе', 'Десерты', 'Детское меню'];
// Сколько раз повторяется набор слов: двух групп не хватало, справа
// открывалась пустота и строка перескакивала на «Детском меню».
const GRUPP = 4;

$NAPRAVLENIYA = [
    ['nazvanie' => 'Завтраки', 'kolichestvo' => '15 позиций', 'podpis' => 'Шакшука, вафли с яйцом пашот, сырники, блины', 'cat' => 'zavtraki', 'foto' => 'shakshuka'],
    ['nazvanie' => 'Роллы и сеты', 'kolichestvo' => '35 позиций', 'podpis' => 'Холодные, темпура, запечённые и 10 готовых сетов', 'cat' => 'sety,rolly-holodnye,rolly-tempura,rolly-zapechennye', 'foto' => 'set-hit-n1'],
    ['nazvanie' => 'Пицца и паста', 'kolichestvo' => '10 позиций', 'podpis' => 'Пицца 29–30 см и паста на любой вкус', 'cat' => 'picca,pasta', 'foto' => 'picca-pepperoni'],
    ['nazvanie' => 'Кофе и напитки', 'kolichestvo' => '17 позиций', 'podpis' => 'Латте с сырной пенкой трёх вкусов', 'cat' => 'kofe-napitki', 'foto' => 'latte-s-syrnoy-penkoy-lavanda'],
    ['nazvanie' => 'Горячее и салаты', 'kolichestvo' => '10 позиций', 'podpis' => 'Борщ, сковородки, цезарь, чизкейк', 'cat' => 'supy-salaty,goryachee-zakuski,deserty', 'foto' => 'borsch'],
    ['nazvanie' => 'Детское меню', 'kolichestvo' => '4 позиции', 'podpis' => 'Мини-роллы, которые понравятся детям', 'cat' => 'detskie-rolly', 'foto' => 'mini-s-ogurcom'],
];

// Позиции без снимка и с чужой съёмкой в подборки не идут.
$sety = dlyaPodborki(blyudaKategorii('sety'));
$zavtrakiSetka = array_map('blyudoPoId', ['shakshuka', 'vafli-s-bekonom', 'syrniki-s-kokosovoy-sguschenkoy', 'bliny-s-lososem']);
$latte = array_map('blyudoPoId', ['latte-s-syrnoy-penkoy-lavanda', 'latte-s-syrnoy-penkoy-malina', 'latte-s-syrnoy-penkoy-popkorn']);
$PODPISI_LATTE = [
    'latte-s-syrnoy-penkoy-lavanda' => 'Латте с сырной пенкой и лавандой',
    'latte-s-syrnoy-penkoy-malina' => 'Латте с сырной пенкой и малиной',
    'latte-s-syrnoy-penkoy-popkorn' => 'Латте с сырной пенкой со вкусом карамельного попкорна',
];
$GALEREYA = ['bar-vitrina', 'neon-schastye-kofe', 'pavlova-romashki', 'stol-rolly-limonad',
    'fotozona-lyustry', 'pavlova-dva', 'rolly-tarelka', 'kofe-love'];

$SHAGI = [
    ['nomer' => '1', 'dudl' => 'vaflya', 'zagolovok' => 'Выберите блюда', 'tekst' => 'Откройте меню и решите, что хотите. Записывать не обязательно — назовёте по телефону.'],
    ['nomer' => '2', 'dudl' => 'chashka', 'zagolovok' => 'Позвоните нам', 'tekst' => KAFE['telefon'] . ', ежедневно с 10:00 до 21:00. Примем заказ и скажем, когда всё будет готово.'],
    ['nomer' => '3', 'dudl' => 'roll', 'zagolovok' => 'Заберите или дождитесь', 'tekst' => 'Самовывоз — ул. Седова, 113/4. Или привезём по городу: при заказе от 1200 ₽ доставка бесплатная.'],
];

$ogFoto = foto('neon-mesto-gde-horosho');

stranica_nachalo([
    'zagolovok' => 'Кафе «Милк» в Благовещенске — завтраки, кофе, роллы и пицца',
    'opisanie' => 'Городское кафе в Благовещенске: завтраки, кофе от своих бариста, роллы, пицца и паста. Каждый день с 10:00 до 21:00.',
    'kanon' => '/',
    'ogKartinka' => rtrim(ADRES, '/') . str_replace(BAZA, '', ($ogFoto['jpg'])(1280)),
    'golova' => shema([
        '@context' => 'https://schema.org', '@type' => 'Restaurant',
        'name' => 'Кафе «Милк»',
        'description' => 'Городское кафе в Благовещенске: завтраки, кофе, роллы, пицца и паста.',
        'address' => ['@type' => 'PostalAddress', 'streetAddress' => 'ул. Седова, 113/4',
            'addressLocality' => 'Благовещенск', 'addressCountry' => 'RU'],
        'telephone' => KAFE['telefon'], 'openingHours' => KAFE['rezhimSchema'],
        'servesCuisine' => ['Завтраки', 'Японская', 'Итальянская', 'Кофе'],
        'url' => rtrim(ADRES, '/') . '/', 'sameAs' => [KAFE['vk']],
    ]),
]);
?>
<!-- Блок 2. Первый экран. Фон — акварельная текстура с вшитыми дудлами,
     снимка здесь нет. Слой дудлов снят: наши SVG легли бы поверх нарисованных. -->
<section class="ekran">
  <?= fon_ekrana() ?>
  <div class="konteyner ekran__vnutri">
    <div class="ekran__tekst">
      <h1>Место, где хорошо</h1>
      <p class="ekran__podzagolovok">
        Кафе «Милк» в центре Благовещенска. Завтраки, кофе от своих бариста, роллы,
        пицца и паста. Каждый день с 10:00 до 21:00.
      </p>
      <div class="ekran__knopki">
        <?= knopka('Смотреть меню', ['adres' => put('/menu')]) ?>
        <?= knopka('Заказать по телефону', ['vid' => 'vtoraya', 'adres' => KAFE['telefonSsylka']]) ?>
      </div>
    </div>
  </div>
</section>

<!-- Блок 3. Бегущая строка -->
<div class="begushchaya" aria-hidden="true">
  <div class="begushchaya__lenta">
    <?php for ($g = 0; $g < GRUPP; $g++): ?>
      <div class="begushchaya__gruppa">
        <?php foreach ($BEGUSHCHAYA as $slovo): ?>
          <span class="begushchaya__punkt"><?= e($slovo) ?>
            <?= dudl('roll', 30, 'rgba(255,255,255,0.75)', 'begushchaya__dudl') ?>
          </span>
        <?php endforeach; ?>
      </div>
    <?php endfor; ?>
  </div>
</div>

<?= volna('var(--milk-rose)') ?>

<!-- Блок 4. О кафе -->
<section class="sekciya o-kafe" id="o-kafe">
  <div class="konteyner o-kafe__setka">
    <div data-poyavlenie>
      <?= foto_layf('neon-mesto-gde-horosho', ['vBlobe' => true, 'nomer' => 1, 'sizes' => '(min-width: 1024px) 44vw, 92vw']) ?>
    </div>
    <div class="o-kafe__tekst" data-poyavlenie style="--zaderzhka: 80ms">
      <h2>Милк — ваше место в сердце города</h2>
      <p>Мы придумали «Милк» как место, куда можно прийти в любом настроении. Утром — сесть
        с ноутбуком и чашкой кофе за столик у окна. Днём — забежать на обед. Вечером —
        собраться компанией за большим столом с сетом роллов.</p>
      <p>Здесь варят кофе из свежеобжаренных зёрен, пекут вафли и сырники, крутят роллы
        и готовят пиццу — всё на одной кухне. И здесь не торопят: можно сидеть с одной
        чашкой столько, сколько нужно.</p>
      <p>На стене у нас светится «Место, где хорошо». Это не слоган, придуманный для
        вывески, — это то, зачем мы открывались.</p>
      <img class="o-kafe__logotip" src="<?= e(put('/images/logo/logo-dekor.webp')) ?>" alt=""
           width="240" height="182" loading="lazy" />
    </div>
  </div>
</section>

<?= volna('var(--milk)') ?>

<!-- Блок 5. Направления кухни -->
<section class="sekciya napravleniya">
  <div class="konteyner">
    <h2 data-poyavlenie>Что у нас есть</h2>
    <p class="napravleniya__podzagolovok" data-poyavlenie>91 позиция в меню — от овсянки до сета на большую компанию.</p>
    <ul class="plitki">
      <?php foreach ($NAPRAVLENIYA as $i => $n): ?>
        <li class="plitki__yacheyka" data-poyavlenie style="--zaderzhka: <?= $i * 80 ?>ms">
          <a class="plitka" href="<?= e(put("/menu?cat={$n['cat']}")) ?>">
            <?= foto_blyuda(blyudoPoId($n['foto']), ['nomer' => $i, 'klass' => 'plitka__foto']) ?>
            <span class="plitka__zaliv"></span>
            <span class="plitka__soderzhimoe">
              <span class="plitka__kolichestvo metka-tekst"><?= e($n['kolichestvo']) ?></span>
              <span class="plitka__nazvanie"><?= e($n['nazvanie']) ?></span>
              <span class="plitka__podpis melkiy"><?= e($n['podpis']) ?></span>
            </span>
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>

<?= volna('var(--milk-rose)') ?>

<!-- Блок 6. Сеты -->
<section class="sekciya sety">
  <div class="konteyner">
    <h2 data-poyavlenie>Сеты — выгоднее, чем поштучно</h2>
    <p class="sety__podzagolovok" data-poyavlenie>
      Собрали десять наборов на любую компанию: от двоих до большого стола.
      В наборе те же роллы, что и в меню, но дешевле.
    </p>
  </div>
  <div class="konteyner">
    <div class="sety__obolochka" data-lenta-obolochka>
      <?= strelka_lenty('nazad') ?>
      <div class="sety__lenta" data-prokrutka tabindex="0" role="group" aria-label="Сеты">
        <div class="sety__ryad">
          <?php foreach ($sety as $i => $s): ?>
            <div class="sety__yacheyka"><?= kartochka_blyuda($s, $i) ?></div>
          <?php endforeach; ?>
        </div>
      </div>
      <?= strelka_lenty('vpered') ?>
    </div>
  </div>
</section>

<?= volna('var(--milk)') ?>

<!-- Блок 7. Завтраки -->
<section class="sekciya zavtraki" id="zavtraki">
  <div class="konteyner zavtraki__setka">
    <div class="zavtraki__tekst" data-poyavlenie>
      <h2>Завтраки, ради которых возвращаются</h2>
      <p>Вафли с беконом, вешенками и яйцом пашот. Сырники с кокосовой сгущёнкой и свежими
        ягодами. Шакшука с болгарским перцем и кинзой. Омлеты из трёх яиц на сливках —
        с лососем, морепродуктами или рваной говядиной. Блины с лососем и крем-муссом.</p>
      <p>Пятнадцать позиций, каждую готовим с утра.</p>
      <?= knopka('Все завтраки', ['vid' => 'vtoraya', 'adres' => put('/menu?cat=zavtraki')]) ?>
    </div>
    <ul class="zavtraki__foto">
      <?php foreach ($zavtrakiSetka as $i => $b): ?>
        <li data-poyavlenie style="--zaderzhka: <?= $i * 80 ?>ms">
          <a href="<?= e(put("/menu/{$b['id']}")) ?>" aria-label="<?= e($b['name']) ?>">
            <?= foto_blyuda($b, ['nomer' => $i]) ?>
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>

<?= volna('var(--coffee-dark)') ?>

<!-- Блок 8. Кофе -->
<section class="sekciya kofe">
  <div class="konteyner kofe__setka">
    <div data-poyavlenie>
      <?= foto_layf('kofe-love', ['vBlobe' => true, 'nomer' => 2, 'sizes' => '(min-width: 1024px) 44vw, 92vw']) ?>
    </div>
    <div class="kofe__tekst" data-poyavlenie style="--zaderzhka: 80ms">
      <h2>Счастье пахнет кофе и тобой</h2>
      <p>Кофе в «Милке» готовят из свежеобжаренных зёрен. Бариста подбирает смесь и мелет
        зерно перед каждым заказом — поэтому чашка эспрессо здесь пахнет так, как должна.</p>
      <p>Кроме классики есть авторское: раф на взбитых сливках и латте
        с солоновато-сливочной сырной пенкой трёх вкусов.</p>
    </div>
  </div>

  <ul class="konteyner kofe__kartochki">
    <?php foreach ($latte as $i => $b): ?>
      <li data-poyavlenie style="--zaderzhka: <?= $i * 80 ?>ms">
        <a class="latte" href="<?= e(put("/menu/{$b['id']}")) ?>">
          <?= foto_blyuda($b, ['nomer' => $i]) ?>
          <span class="latte__nazvanie"><?= e(str_replace(['«', '»'], '', preg_replace('/^Латте с сырной пенкой /u', '', $b['name']))) ?></span>
          <span class="latte__podpis melkiy"><?= e($PODPISI_LATTE[$b['id']]) ?></span>
          <span class="latte__cena"><?= e(cena((int) $b['price'])) ?></span>
        </a>
      </li>
    <?php endforeach; ?>
  </ul>

  <div class="konteyner kofe__niz">
    <p class="kofe__pripiska melkiy">Альтернативное молоко +70&nbsp;₽ · Сироп +20&nbsp;₽</p>
    <?= knopka('Вся кофейная карта', ['vid' => 'vtoraya', 'adres' => put('/menu?cat=kofe-napitki'), 'klass' => 'kofe__knopka']) ?>
  </div>
</section>

<?= volna('var(--milk)') ?>

<!-- Блок 9. Банкеты -->
<section class="sekciya bankety" id="bankety">
  <div class="konteyner bankety__setka">
    <div class="bankety__tekst" data-poyavlenie>
      <h2>Банкеты и большие компании</h2>
      <p>Зал «Милка» вмещает большую компанию — накрываем один длинный стол на всех сразу,
        без рассадки гостей по разным углам. День рождения, корпоратив, встреча выпускников,
        новогодний вечер.</p>
      <p>Меню собираем под повод: холодные закуски и салаты, горячее, роллы и сеты, десерты.
        Можно взять то, что уже есть в меню, а можно обсудить блюда отдельно. Зал оформляем
        под событие.</p>
      <p>Позвоните — обсудим дату, количество гостей и меню.</p>
      <?= knopka('Забронировать зал', ['atributy' => [
          'data-otkryt' => 'zakaz',
          'data-zagolovok' => 'Забронировать зал',
          'data-tekst' => 'Позвоните — обсудим дату, количество гостей и меню под ваш повод.',
      ]]) ?>
    </div>
    <div class="bankety__foto" data-poyavlenie style="--zaderzhka: 80ms">
      <?= foto_layf('banket-zhemchug', ['vBlobe' => true, 'nomer' => 0, 'klass' => 'bankety__kadr bankety__kadr--pervyy', 'sizes' => '40vw']) ?>
      <?= foto_layf('banket-novogodniy', ['vBlobe' => true, 'nomer' => 2, 'klass' => 'bankety__kadr bankety__kadr--vtoroy', 'sizes' => '40vw']) ?>
    </div>
  </div>
</section>

<?= volna('var(--milk-rose)') ?>

<!-- Блок 10. Галерея -->
<section class="sekciya galereya">
  <div class="konteyner"><h2 data-poyavlenie>Как у нас</h2></div>
  <div class="galereya__polosy">
    <div class="galereya__polosa" data-parallaks="0.15" data-parallaks-os="x" data-parallaks-predel="160">
      <?php foreach (array_slice($GALEREYA, 0, 4) as $imya): ?>
        <?= foto_layf($imya, ['klass' => 'galereya__kadr', 'sizes' => '320px']) ?>
      <?php endforeach; ?>
    </div>
    <div class="galereya__polosa galereya__polosa--nazad" data-parallaks="-0.15" data-parallaks-os="x" data-parallaks-predel="160">
      <?php foreach (array_slice($GALEREYA, 4) as $imya): ?>
        <?= foto_layf($imya, ['klass' => 'galereya__kadr', 'sizes' => '320px']) ?>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<?= volna('var(--milk)') ?>

<!-- Блок 11. Как заказать -->
<section class="sekciya kak-zakazat">
  <div class="konteyner">
    <h2 data-poyavlenie>Заказать просто</h2>
    <ol class="shagi">
      <?php foreach ($SHAGI as $i => $sh): ?>
        <li class="shag" data-poyavlenie style="--zaderzhka: <?= $i * 80 ?>ms">
          <span class="shag__nomer" aria-hidden="true"><?= e($sh['nomer']) ?></span>
          <?= dudl($sh['dudl'], 48, 'var(--coffee-deep)', 'shag__dudl') ?>
          <h3 class="shag__zagolovok"><?= e($sh['zagolovok']) ?></h3>
          <p class="melkiy"><?= e($sh['tekst']) ?></p>
        </li>
      <?php endforeach; ?>
    </ol>
    <div class="kak-zakazat__niz" data-poyavlenie>
      <a class="kak-zakazat__telefon" href="<?= e(KAFE['telefonSsylka']) ?>"><?= e(KAFE['telefon']) ?></a>
      <p class="melkiy priglushenno">Доставка по Благовещенску. От 1200&nbsp;₽ — бесплатно.</p>
    </div>
  </div>
</section>

<?= volna('var(--milk-rose)') ?>

<!-- Блок 12. Контакты -->
<section class="sekciya kontakty" id="kontakty">
  <div class="konteyner kontakty__setka">
    <div class="kontakty__tekst" data-poyavlenie>
      <h2>Где нас найти</h2>
      <dl class="kontakty__spisok">
        <dt class="metka-tekst priglushenno">Адрес</dt>
        <dd><?= e(KAFE['adres']) ?></dd>
        <dt class="metka-tekst priglushenno">Телефон</dt>
        <dd><a class="kontakty__telefon" href="<?= e(KAFE['telefonSsylka']) ?>"><?= e(KAFE['telefon']) ?></a></dd>
        <dt class="metka-tekst priglushenno">Режим работы</dt>
        <dd><?= e(KAFE['rezhim']) ?></dd>
        <dt class="metka-tekst priglushenno">ВКонтакте</dt>
        <dd><a class="tekst-ssylka" href="<?= e(KAFE['vk']) ?>" target="_blank" rel="noopener"><?= e(KAFE['vkPodpis']) ?></a></dd>
      </dl>
    </div>

    <div class="karta" data-poyavlenie style="--zaderzhka: 80ms">
      <div class="karta__polotno">
        <?= dudl('metka', 56, 'var(--orange)', 'karta__metka') ?>
        <p class="karta__adres"><?= e(KAFE['adresKratko']) ?></p>
      </div>
      <?= knopka('Открыть в Яндекс.Картах', [
          'vid' => 'vtoraya',
          'adres' => 'https://yandex.ru/maps/?text=Благовещенск, улица Седова, 113/4',
          'target' => '_blank',
      ]) ?>
    </div>
  </div>
</section>
<?php
stranica_konec(['dvizhenie', 'lenta']);
