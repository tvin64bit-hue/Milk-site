// Форма позиции: подстановка адреса из названия и обрезка снимка.
(function () {
  'use strict';

  // ---- Адрес страницы из названия ------------------------------------
  var KARTA = {
    а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y',
    к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
    х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
  };

  function vIdentifikator(nazvanie) {
    var stroka = nazvanie.toLowerCase().split('').map(function (s) {
      return KARTA[s] !== undefined ? KARTA[s] : s;
    }).join('');
    return stroka.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var poleNazvaniya = document.getElementById('name');
  var poleId = document.getElementById('id');
  var obrazec = document.getElementById('obrazec-id');
  // Адрес подставляется, пока его не правили руками: у существующих
  // позиций менять адрес нельзя молча — на него уже могут быть ссылки.
  var pravilRukami = poleId.value !== '';

  poleId.addEventListener('input', function () { pravilRukami = true; pokazat(); });

  poleNazvaniya.addEventListener('input', function () {
    if (!pravilRukami) { poleId.value = vIdentifikator(poleNazvaniya.value); }
    pokazat();
  });

  function pokazat() {
    if (obrazec) { obrazec.textContent = poleId.value || '…'; }
  }

  // ---- Обрезка снимка --------------------------------------------------
  var poleFajla = document.getElementById('snimok');
  var blok = document.getElementById('obrezka');
  var polotno = document.getElementById('polotno');
  var poleRamki = document.getElementById('ramka');
  var rezak = null;

  poleFajla.addEventListener('change', function () {
    var fajl = poleFajla.files && poleFajla.files[0];
    if (!fajl) {
      blok.classList.remove('obrezka--vidna');
      poleRamki.value = '';
      return;
    }

    var chtenie = new FileReader();
    chtenie.onload = function (sobytie) {
      polotno.src = sobytie.target.result;
      blok.classList.add('obrezka--vidna');
      if (rezak) { rezak.destroy(); }
      rezak = new Cropper(polotno, {
        // Квадрат: в каталоге карточки квадратные, и рамка должна
        // показывать ровно то, что попадёт в сетку.
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.9,
        background: false,
        crop: function (e) {
          poleRamki.value = JSON.stringify({
            x: Math.round(e.detail.x),
            y: Math.round(e.detail.y),
            width: Math.round(e.detail.width),
            height: Math.round(e.detail.height)
          });
        }
      });
    };
    chtenie.readAsDataURL(fajl);
  });
})();
