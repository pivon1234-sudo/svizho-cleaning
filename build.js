#!/usr/bin/env node
/* ==========================================================
   Збірка сайту: content/*.json + src/*.html  →  dist/
   Без залежностей. Запуск:  node build.js
   Netlify запускає його автоматично перед кожним деплоєм.
   ========================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const STATIC = ["styles.css", "main.js", "favicon.svg", "robots.txt", "admin", "assets"];

/* ---------- Дані ---------- */
const C = {};
for (const file of fs.readdirSync(path.join(ROOT, "content"))) {
  if (!file.endsWith(".json")) continue;
  const name = path.basename(file, ".json");
  try {
    C[name] = JSON.parse(fs.readFileSync(path.join(ROOT, "content", file), "utf8"));
  } catch (e) {
    fail(`content/${file}: некоректний JSON — ${e.message}`);
  }
}

const num = new Intl.NumberFormat("uk-UA");
const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function fail(msg) {
  console.error("\n✖ Помилка збірки: " + msg + "\n");
  process.exit(1);
}
function need(cond, msg) { if (!cond) fail(msg); }

/* ---------- Перевірка даних ---------- */
need(C.services && Array.isArray(C.services.items) && C.services.items.length === 3,
  "content/services.json: має бути рівно 3 послуги (вони відповідають колонкам чек-листа).");
C.services.items.forEach((s, i) => {
  need(s.name, `Послуга №${i + 1}: не вказано назву.`);
  need(Number.isFinite(+s.price_per_m2) && +s.price_per_m2 > 0, `Послуга «${s.name}»: ціна за м² має бути числом більше 0.`);
  need(Number.isFinite(+s.min_price) && +s.min_price >= 0, `Послуга «${s.name}»: мінімальна ціна має бути числом.`);
});
need(Number.isFinite(+C.extras.window_price), "content/extras.json: ціна вікна має бути числом.");
(C.extras.items || []).forEach((x) => need(x.name && Number.isFinite(+x.price), `Додаткова послуга «${x.name || "?"}»: потрібні назва й ціна.`));
need(C.contacts && C.contacts.phone, "content/contacts.json: не вказано телефон.");

/* ---------- Обчислені значення ---------- */
C.contacts.phone_href = "tel:" + C.contacts.phone.replace(/[^\d+]/g, "");
C.contacts.hours_lower = C.contacts.hours.charAt(0).toLowerCase() + C.contacts.hours.slice(1);
C.extras.window_price_text = num.format(C.extras.window_price);

/* ---------- Блоки, що повторюються ---------- */
const CELL = {
  yes: '<td class="yes">Так</td>',
  no: '<td class="no">—</td>',
  extra: '<td class="extra">Окремо</td>',
};

const blocks = {
  services: () => C.services.items.map((s, i) => `
          <article class="service${i === 1 ? " service--accent" : ""}">
            <h3>${esc(s.name)}</h3>
            <p>${esc(s.description)}</p>
            <p class="service__price"><span>від</span> ${num.format(s.price_per_m2)} <small>грн/м²</small></p>
            <a class="service__link" href="#order" data-pick="${i}">Обрати: ${esc(s.name.toLowerCase())}</a>
          </article>`).join(""),

  checklist: () => {
    const head = `
            <thead>
              <tr>
                <th scope="col">Роботи</th>
${C.services.items.map((s) => `                <th scope="col">${esc(s.name)}</th>`).join("\n")}
              </tr>
            </thead>`;
    const body = (C.checklist.groups || []).map((g) => `
              <tr class="checklist__group"><th scope="rowgroup" colspan="4">${esc(g.name)}</th></tr>` +
      (g.rows || []).map((r) => `
              <tr><th scope="row">${esc(r.task)}</th>${CELL[r.s1] || CELL.no}${CELL[r.s2] || CELL.no}${CELL[r.s3] || CELL.no}</tr>`).join("")
    ).join("");
    return head + "\n            <tbody>" + body + "\n            </tbody>";
  },

  steps: () => (C.process.steps || []).map((s) => `
          <li>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.text)}</p>
          </li>`).join(""),

  types: () => C.services.items.map((s, i) => `
                <label><input type="radio" name="type" value="${esc(s.name)}" data-key="${i}" data-per-m2="${+s.price_per_m2}" data-min="${+s.min_price}"${i === 0 ? " checked" : ""}><span>${esc(s.name)}</span></label>`).join(""),

  extras: () => (C.extras.items || []).map((x) => `
                <label class="check"><input type="checkbox" name="extras" value="${esc(x.name)}" data-price="${+x.price}"><span>${esc(x.name)} <small>${num.format(x.price)} грн</small></span></label>`).join(""),

  faq: () => (C.faq.items || []).map((f) => `
          <details>
            <summary>${esc(f.question)}</summary>
            <p>${esc(f.answer)}</p>
          </details>`).join(""),
};

/* ---------- Шаблонізатор ---------- */
function render(tpl, file) {
  return tpl
    .replace(/<!--\s*@(\w+)\s*-->/g, (_, name) => {
      if (!blocks[name]) fail(`${file}: невідомий блок @${name}`);
      return blocks[name]();
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const val = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), C);
      if (val === undefined) fail(`${file}: немає значення для {{${key}}}`);
      return esc(val);
    });
}

/* ---------- Збірка ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const file of fs.readdirSync(path.join(ROOT, "src"))) {
  if (!file.endsWith(".html")) continue;
  const html = render(fs.readFileSync(path.join(ROOT, "src", file), "utf8"), "src/" + file);
  fs.writeFileSync(path.join(OUT, file), html);
}
for (const item of STATIC) {
  const from = path.join(ROOT, item);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(OUT, item), { recursive: true });
}

console.log("✔ Сайт зібрано в dist/");
