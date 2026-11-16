#!/usr/bin/env bash
# Публікує правки: commit + push у main. Netlify побачить push і сам оновить сайт.
# Використання:  ./publish.sh "що змінили"
# Правки з адмінки (/admin) комітяться самі — перед локальними правками зробіть git pull.
set -euo pipefail
cd "$(dirname "$0")"

msg="${1:-Оновлення сайту}"

# Netlify (безкоштовний план, приватний репо) деплоїть лише коміти,
# автор яких — ваш GitHub-акаунт. Перевіряємо, що email задано.
email="$(git config user.email || true)"
if [ -z "$email" ] || [[ "$email" == *.local ]]; then
  echo "Помилка: у git не задано ваш GitHub-email (зараз: '${email:-порожньо}')."
  echo "Виконайте в цій папці:"
  echo '  git config user.email "<id>+<логін>@users.noreply.github.com"'
  echo "(адресу видно на github.com/settings/emails)"
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Немає змін для публікації."
  exit 0
fi

# Перевіряємо, що сайт збирається, перш ніж відправляти
node build.js

git add -A
git commit -m "$msg"
# Підтягуємо правки, зроблені в адмінці, щоб не було конфлікту
git pull --rebase origin main
git push origin main
echo "Готово. Netlify почав деплой — перевірте вкладку Deploys у панелі Netlify."
