#!/usr/bin/env bash
# Публікує правки: commit + push у main. Netlify побачить push і сам оновить сайт.
# Використання:  ./publish.sh "що змінили"
set -euo pipefail
cd "$(dirname "$0")"

msg="${1:-Оновлення сайту}"

if [ -z "$(git status --porcelain)" ]; then
  echo "Немає змін для публікації."
  exit 0
fi

git add -A
git commit -m "$msg"
git push origin main
echo "Готово. Netlify почав деплой — перевірте вкладку Deploys у панелі Netlify."
