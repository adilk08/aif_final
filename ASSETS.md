# Графика и голоса «Последнего маршрута»

## Портрет

`assets/portraits/ilya.png` — оригинальная иллюстрация вымышленного механика. Создана встроенным генератором изображений OpenAI; не копирует внешнюю игру или реального человека. Используется в разговоре, списке сигналов и карточке пассажира.

Промпт: “Create a single square game character portrait asset for a browser RPG called Last Route. Subject: Ilya, a fictional railway mechanic, male about 38, tired but kind eyes, short dark hair, light stubble, protective brass work goggles resting on his forehead, rugged teal mechanic jacket with worn orange shoulder accents, a small old railway radio clipped at chest. Chest-up close portrait, looking slightly toward the viewer. Style: polished hand-painted 2D indie adventure game character illustration, expressive face, clear bold silhouette, restrained detailed brushwork, realistic stylized proportions, NOT pixel art, NOT photorealism, NOT anime. Palette: deep ink navy background, muted teal clothes, warm amber rim lighting and soft cool cyan fill, matching a dark neon rail station. Simple flat dark navy background with very subtle radio glow, no scenery. Face and shoulders centered and readable at 90px. No text, no letters, no watermark, no UI, no border.”

Поезд, значки интерфейса, схемы маршрутов и портрет АРИАДНЫ нарисованы непосредственно в SVG/CSS. Иллюстрации боевых карт сохранены из предыдущей версии проекта.

## Реплики

44 локальных MP3 в `assets/voices/`. Точные тексты — `LINES` в `campaign-presentation.js` и `CHAPTER_LINES` в `campaign-story.js`; соответствие аудио и реплик — `assets/voices/manifest.js`. Первые 20 реплик описаны ниже, дополнение Архива — в конце файла.

- АРИАДНА: HeyGen Voice, публичный голос Antonia — Calm & Articulate, ID `f3318f83c10547dba19f61533d80e258`; русский язык, модель выбрана сервером. Исходный дубль 56.691 секунды.
- Илья: HeyGen Voice, публичный голос Wade — Resonant & Narrative, ID `a3a4aa242aaf431ea8ec2c4b3bb332fa`; русский язык, модель выбрана сервером. Исходный дубль 39.110 секунды.

Использованы готовые публичные синтетические голоса, без клонирования реальных людей. Два непрерывных дубля разделены по возвращённым сервисом таймкодам символов. Скорость и высота не менялись. Тексты сверены с полным возвращённым выравниванием, все 20 файлов декодируются без ошибок. Запуск, выключение и повтор проверяются в браузере. Полное прослушивание исходных дублей в среде агента недоступно; художественное качество голоса на слух не оценивалось.

Служебные оригиналы и подробные границы сегментов находятся в игнорируемой папке `.build`; на сайт поступают только готовые MP3. Во время игры запросы в HeyGen не отправляются. Подписки, ключи и API посетителю не нужны. Голос включается отдельно и не заменяет субтитры.

## Архив — 11 ноября 2026

Добавлены 24 реплики, три непрерывных исходных дубля HeyGen Voice, language `ru`, модель выбрана сервером, speed/pitch не менялись. Публичные голоса проверены в каталоге; клонирование не использовалось:

- АРИАДНА — прежняя Antonia, 5 реплик, оригинал 36.7895 s.
- Илья — прежний Wade, 7 реплик, оригинал 50.0565 s.
- Мира — Joanna / Warm & Conversational, `776f9d2ff401499a8f1f2bcb4ca46004`, 12 реплик, оригинал 81.3788 s.

Все 24 текста совпали с возвращённым посимвольным выравниванием. Сегменты выделены по реальным границам с небольшим запасом тишины, сохранены в MP3 96 kbit/s и декодированы без ошибок. Исходники, точный текст и границы сегментов сохранены в `.build/archive-voice-*.json` и `.build/archive-voice-provenance.json`. Полное прослушивание недоступно; это проверка целостности/синхронизации и браузерного воспроизведения, а не художественная оценка на слух.

Портрет Миры: `assets/portraits/mira.png`, оригинальная вымышленная героиня, built-in image generation / generate / stylized-concept. Изображение проверено визуально и скопировано в проект без обработки из `C:/Users/Lenovo/.codex/generated_images/01a1a8b5-c715-7322-9929-e9393c6668fc/exec-f3d02951-0f32-450e-8aca-5a0f0b40f2d6.png`. Промпт:

Use case: stylized-concept. Asset type: character dialogue portrait for the browser RPG Last Route. Generate an original fictional woman, Mira, about 35, an archivist and field medic in a drowned retrofuturist city. Head and shoulders, close-up with entire head visible, facing slightly right but looking at the viewer with intelligence, exhaustion and reserved empathy. Short dark brown bob, thin round brass eyeglasses, subtle freckles, a weathered slate-blue raincoat and faded lavender scarf, a small paper notebook tucked at the chest. Beautiful detailed hand-painted narrative RPG concept art, confident irregular brushwork, graphic ink-like edges, believable face and anatomy, painterly realism rather than photo or vector. Warm amber rim light left, cool blue rim light right, rich dark midnight navy plain background. Eyes and facial expression clearly readable at thumbnail size. Square canvas. No words, logos, badges, text, watermarks or frame. No similarity to a real person.

## Графика внутреннего комплекса

В каталоге `assets/sector/` находятся 35 изображений WebP для поезда, двух районов, карт действий, бойцов и карты местности. Сцены и наборы оригинальных иллюстраций созданы с помощью ImageGen для этой игры. Изображения нарезаны и сжаты локально.

В `assets/duel/` находятся шесть оригинальных профильных портретов и фон технического отсека, созданные ImageGen. Модуль `duel.js` строит по силуэтам рельефные двусторонние сетки с текстурами, деформирует голову и плечи в WebGL и показывает портреты при отсутствии WebGL.

В Садах 22 реплики перезаписаны выбранными голосами HeyGen на русском. Лада — Galina (13), Мира — Joanna (7), АРИАДНА — Antonia (2). Голос Лады на плёнке проходит полосовой фильтр, после реплики слышен двойной звон. При вызове поезда и в ответе следующего района проигрывается один и тот же файл выбранного дежурного.
