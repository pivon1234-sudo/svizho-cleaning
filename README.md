# Свіжо — сайт клінінгу

Статичний сайт (HTML + CSS + JS, без збірки). Деплой: **GitHub → Netlify**, автоматично після кожного `git push` у гілку `main`.

## Структура

| Файл | Що в ньому |
|---|---|
| `index.html` | Уся головна сторінка: тексти, послуги, чек-лист, FAQ, форма заявки |
| `styles.css` | Стилі. Кольори й шрифти — змінні на початку файлу (`:root`) |
| `main.js` | «Пил» у першому екрані та калькулятор. **Ціни — об'єкт `PRICING` на початку файлу** |
| `thanks.html` | Сторінка після надсилання заявки |
| `404.html` | Сторінка «не знайдено» |
| `netlify.toml` | Налаштування Netlify (папка публікації, заголовки) |
| `publish.sh` | Публікація правок однією командою |

## Перший запуск (один раз)

### 1. Репозиторій на GitHub
Створіть порожній репозиторій на github.com (без README), потім у цій папці:

```bash
git remote add origin https://github.com/<ваш-логін>/<назва-репо>.git
git push -u origin main
```

Або одною командою через GitHub CLI:

```bash
gh repo create svizho-cleaning --private --source=. --push
```

### 2. Підключення Netlify
1. app.netlify.com → **Add new site → Import an existing project → GitHub**.
2. Оберіть репозиторій.
3. Налаштування підтягнуться з `netlify.toml` (Build command — порожньо, Publish directory — `.`). Натисніть **Deploy**.

Готово: з цього моменту **кожен push у `main` автоматично оновлює сайт** (зазвичай за 10–30 секунд), а кожен Pull Request отримує власну preview-адресу.

### 3. Заявки з форми
Форма працює через **Netlify Forms** — сервер не потрібен.
- Заявки: Netlify → ваш сайт → **Forms → booking**.
- Сповіщення на пошту: **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email**. Вкажіть пошту, на яку мають приходити заявки.

> Якщо форма не з'явилась у Forms: **Site configuration → Forms → Enable form detection**, потім зробіть новий деплой (Deploys → Trigger deploy).

## Як вносити правки

1. Змініть файли.
2. Опублікуйте:

```bash
./publish.sh "Оновив ціни"
```

Скрипт робить `git add` + `commit` + `push`, а Netlify сам публікує нову версію. Статус — у вкладці **Deploys** на Netlify.

## Перегляд локально

```bash
python3 -m http.server 8000
```

Відкрийте http://localhost:8000. (Форма локально не надсилається — вона працює лише на Netlify.)

## Що замінити перед запуском

- [ ] Телефон `+380 00 000 00 00` (у `index.html` — шапка hero і підвал, посилання `tel:`)
- [ ] Пошта `hello@example.com` (підвал)
- [ ] Ціни — `PRICING` і `WINDOW_PRICE` у `main.js` **та** «від … грн/м²» у картках послуг в `index.html`; ціни доп. послуг — атрибути `data-price` у формі
- [ ] Назва «Свіжо», місто, графік роботи, відповіді у FAQ
- [ ] Власний домен: Netlify → **Domain management → Add a domain**
