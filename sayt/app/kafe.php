<?php
// Постоянные сведения о кафе. Все значения взяты из технического задания.
// Ничего выдуманного здесь быть не должно.

declare(strict_types=1);

const KAFE = [
    'nazvanie' => 'Кафе «Милк»',
    'gorod' => 'Благовещенск',
    'adres' => 'Благовещенск, ул. Седова, 113/4',
    'adresKratko' => 'ул. Седова, 113/4',
    'telefon' => '+7 961 362-59-43',
    'telefonSsylka' => 'tel:+79613625943',
    'rezhim' => 'Ежедневно с 10:00 до 21:00',
    'rezhimSchema' => 'Mo-Su 10:00-21:00',
    'vk' => 'https://vk.ru/kafe_milk',
    'vkPodpis' => 'vk.com/kafe_milk',
    'dostavkaOt' => 1200,
    'koordinaty' => ['shirota' => 55.048694, 'dolgota' => 55.954596],
    'pozicij' => 91,
];

// Пункты главного меню. Все, кроме «Меню», ведут на якоря главной страницы.
const NAVIGACIYA = [
    ['nazvanie' => 'О нас', 'adres' => '/#o-kafe'],
    ['nazvanie' => 'Меню', 'adres' => '/menu'],
    ['nazvanie' => 'Завтраки', 'adres' => '/#zavtraki'],
    ['nazvanie' => 'Банкеты', 'adres' => '/#bankety'],
    ['nazvanie' => 'Контакты', 'adres' => '/#kontakty'],
];
