# -*- coding: utf-8 -*-
"""
Разбирает PDF-страницы товаров (ВК Маркет) из папки Menu:
  - вытаскивает фото блюда (картинка с максимальным разрешением);
  - берёт название и цену из имени файла;
  - берёт описание из текста между "Описание" и "Пожаловаться на товар";
  - складывает всё в общий текстовый файл menu.txt.

Всё сохраняется в ту же папку, где лежат PDF.

Запуск:
    python menu_parser.py
"""

import sys
import subprocess
import os
import re

# ---------------------------------------------------------------------------
# 1. Автоустановка нужной библиотеки (PyMuPDF), если она ещё не установлена
# ---------------------------------------------------------------------------
try:
    import fitz  # PyMuPDF
except ImportError:
    print("Библиотека PyMuPDF не найдена, устанавливаю...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pymupdf"])
    import fitz

# ---------------------------------------------------------------------------
# 2. Настройки
# ---------------------------------------------------------------------------
FOLDER = r"C:\Users\tvin6\Downloads\Milk-Site\Menu"
OUTPUT_TXT = "menu.txt"

# Маркеры, между которыми лежит описание товара на странице
DESC_START = "Описание"
DESC_END_MARKERS = ("Пожаловаться на товар", "Отзывы", "О продавце")

# Символы, недопустимые в именах файлов Windows
BAD_CHARS = r'<>:"/\|?*'


# ---------------------------------------------------------------------------
# 3. Вспомогательные функции
# ---------------------------------------------------------------------------
def safe_filename(name):
    """Убирает из строки символы, которые нельзя использовать в имени файла."""
    for ch in BAD_CHARS:
        name = name.replace(ch, "")
    return name.strip().rstrip(".")


def parse_name_and_price(pdf_path):
    """
    Достаёт название и цену из имени файла вида:
        Креветки_темпура_-_купить_за_590_руб__на_ВК_Маркет.pdf
    Возвращает (название, цена) — цена в виде строки или None.
    """
    base = os.path.splitext(os.path.basename(pdf_path))[0]

    m = re.match(r"^(.*?)_-_купить_за_([\d\s_]+)_руб", base)
    if m:
        name = m.group(1).replace("_", " ").strip()
        price = m.group(2).replace("_", " ").strip()
        price = re.sub(r"\s+", " ", price)
        return name, price

    # Фолбэк: шаблон не совпал — берём имя файла целиком, цену ищем позже в тексте
    return base.replace("_", " ").strip(), None


def get_sorted_spans(page):
    """Возвращает текстовые фрагменты страницы, отсортированные сверху вниз."""
    spans = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:  # не текстовый блок
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                # \xa0 — неразрывный пробел, встречается в тексте страниц ВК
                text = span["text"].replace("\xa0", " ").strip()
                if text:
                    spans.append((round(span["bbox"][1], 1), round(span["bbox"][0], 1), text))
    spans.sort()
    return spans


def parse_description(doc):
    """Ищет описание между маркером 'Описание' и одним из конечных маркеров."""
    for page in doc:
        spans = get_sorted_spans(page)

        start = None
        for i, (y, x, text) in enumerate(spans):
            if text == DESC_START:
                start = i
                break

        if start is None:
            continue

        lines = []
        for y, x, text in spans[start + 1:]:
            if any(text.startswith(marker) for marker in DESC_END_MARKERS):
                break
            lines.append(text)

        if lines:
            return "\n".join(lines)

    return ""


def parse_price_from_text(doc):
    """Фолбэк: ищет первую цену вида '590 ₽' в тексте документа."""
    for page in doc:
        for y, x, text in get_sorted_spans(page):
            m = re.search(r"(\d[\d\s]*)\s*(?:₽|руб)", text)
            if m:
                return re.sub(r"\s+", " ", m.group(1).strip())
    return ""


def extract_best_image(doc, out_folder, dish_name):
    """
    Сохраняет картинку с максимальным разрешением как <Название блюда>.<ext>.
    Возвращает имя сохранённого файла или '' если картинок нет.
    """
    best_bytes = None
    best_ext = None
    best_pixels = -1
    best_size = None

    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                base_image = doc.extract_image(xref)
            except Exception as e:
                print(f"  [!] Не удалось извлечь xref={xref}: {e}")
                continue

            pixels = base_image.get("width", 0) * base_image.get("height", 0)
            if pixels > best_pixels:
                best_pixels = pixels
                best_bytes = base_image["image"]
                best_ext = base_image["ext"]
                best_size = (base_image.get("width", 0), base_image.get("height", 0))

    if best_bytes is None:
        return ""

    out_name = f"{safe_filename(dish_name)}.{best_ext}"
    with open(os.path.join(out_folder, out_name), "wb") as f:
        f.write(best_bytes)

    print(f"  Фото: {out_name} ({best_size[0]}x{best_size[1]})")
    return out_name


# ---------------------------------------------------------------------------
# 4. Основной проход
# ---------------------------------------------------------------------------
def main():
    if not os.path.isdir(FOLDER):
        print(f"Папка не найдена: {FOLDER}")
        return

    pdf_files = sorted(
        f for f in os.listdir(FOLDER)
        if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(FOLDER, f))
    )

    if not pdf_files:
        print(f"В папке {FOLDER} не найдено PDF-файлов.")
        return

    print(f"Найдено PDF-файлов: {len(pdf_files)}\n")
    entries = []

    for pdf_name in pdf_files:
        pdf_path = os.path.join(FOLDER, pdf_name)
        print(f"Обрабатываю: {pdf_name}")

        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            print(f"  [!] Не удалось открыть файл: {e}\n")
            continue

        try:
            name, price = parse_name_and_price(pdf_path)
            description = parse_description(doc)

            if not price:
                price = parse_price_from_text(doc)

            image_name = extract_best_image(doc, FOLDER, name)

            if not description:
                print("  [!] Описание не найдено.")
            if not price:
                print("  [!] Цена не найдена.")

            entries.append({
                "name": name,
                "description": description,
                "price": price,
                "image": image_name,
            })
            print(f"  Название: {name} | Цена: {price or '—'}\n")
        finally:
            doc.close()

    # Запись общего текстового файла
    txt_path = os.path.join(FOLDER, OUTPUT_TXT)
    with open(txt_path, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(f"Название: {e['name']}\n")
            f.write(f"Описание: {e['description']}\n")
            f.write(f"Цена: {e['price']} руб\n")
            f.write(f"Изображение: {e['image']}\n")
            f.write("---\n\n")

    print(f"Готово. Обработано блюд: {len(entries)}")
    print(f"Список сохранён в: {txt_path}")


if __name__ == "__main__":
    main()