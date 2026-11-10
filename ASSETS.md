# Графика и голоса «Последнего маршрута»

## Портрет

`assets/portraits/ilya.png` — оригинальная иллюстрация вымышленного механика. Создана встроенным генератором изображений OpenAI; не копирует внешнюю игру или реального человека. Используется в разговоре, списке сигналов и карточке пассажира.

Промпт: “Create a single square game character portrait asset for a browser RPG called Last Route. Subject: Ilya, a fictional railway mechanic, male about 38, tired but kind eyes, short dark hair, light stubble, protective brass work goggles resting on his forehead, rugged teal mechanic jacket with worn orange shoulder accents, a small old railway radio clipped at chest. Chest-up close portrait, looking slightly toward the viewer. Style: polished hand-painted 2D indie adventure game character illustration, expressive face, clear bold silhouette, restrained detailed brushwork, realistic stylized proportions, NOT pixel art, NOT photorealism, NOT anime. Palette: deep ink navy background, muted teal clothes, warm amber rim lighting and soft cool cyan fill, matching a dark neon rail station. Simple flat dark navy background with very subtle radio glow, no scenery. Face and shoulders centered and readable at 90px. No text, no letters, no watermark, no UI, no border.”

Поезд, значки интерфейса, схемы маршрутов и портрет АРИАДНЫ нарисованы непосредственно в SVG/CSS. Иллюстрации боевых карт сохранены из предыдущей версии проекта.

## Реплики

20 локальных MP3 в `assets/voices/`. Точные тексты — `LINES` в `campaign-presentation.js`; соответствие аудио и реплик — `assets/voices/manifest.js`.

- АРИАДНА: HeyGen Voice, публичный голос Antonia — Calm & Articulate, ID `f3318f83c10547dba19f61533d80e258`; русский язык, модель выбрана сервером. Исходный дубль 56.691 секунды.
- Илья: HeyGen Voice, публичный голос Wade — Resonant & Narrative, ID `a3a4aa242aaf431ea8ec2c4b3bb332fa`; русский язык, модель выбрана сервером. Исходный дубль 39.110 секунды.

Использованы готовые публичные синтетические голоса, без клонирования реальных людей. Два непрерывных дубля разделены по возвращённым сервисом таймкодам символов. Скорость и высота не менялись. Тексты сверены с полным возвращённым выравниванием, все 20 файлов декодируются без ошибок. Запуск, выключение и повтор проверяются в браузере. Полное прослушивание исходных дублей в среде агента недоступно; художественное качество голоса на слух не оценивалось.

Служебные оригиналы и подробные границы сегментов находятся в игнорируемой папке `.build`; на сайт поступают только готовые MP3. Во время игры запросы в HeyGen не отправляются. Подписки, ключи и API посетителю не нужны. Голос включается отдельно и не заменяет субтитры.
