/* ==========================================================
   Свіжо — скрипти сайту
   1) «Пил» у hero, який відвідувач протирає курсором/пальцем
   2) Калькулятор вартості
   ========================================================== */
(function () {
  "use strict";

  /* ---------- Ціни (змінюйте тут) ---------- */
  var PRICING = {
    regular:    { label: "Підтримуюче",   perM2: 35, min: 1200 },
    deep:       { label: "Генеральне",    perM2: 60, min: 2400 },
    renovation: { label: "Після ремонту", perM2: 85, min: 3500 }
  };
  var WINDOW_PRICE = 150; // грн за стулку

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt = new Intl.NumberFormat("uk-UA");

  /* ======================================================
     1. Пилова плівка в hero
     ====================================================== */
  var card = document.querySelector(".hero__card");
  var canvas = document.querySelector(".hero__dust");
  var hint = document.querySelector(".hero__hint");
  var hintText = hint && hint.querySelector("[data-hint]");

  if (card && canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var CELL = 28;          // розмір клітинки для підрахунку протертої площі
    var BRUSH = 46;         // радіус «ганчірки», CSS px
    var DONE_AT = 0.5;      // яка частка має бути протерта
    var dpr = 1, w = 0, h = 0, cols = 0, rows = 0;
    var cells, cleanedCount = 0, isClean = false, last = null;

    // Простий детермінований генератор, щоб пил виглядав однаково
    function rng(seed) {
      return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    }

    function paintDust() {
      var rect = card.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // Основний шар пилу
      ctx.fillStyle = "rgb(184, 178, 164)";
      ctx.fillRect(0, 0, w, h);

      var r = rng(7);
      // Розводи й плями
      for (var i = 0; i < 28; i++) {
        var x = r() * w, y = r() * h, rad = 60 + r() * 220;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        var dark = r() > 0.5;
        g.addColorStop(0, dark ? "rgba(120, 110, 92, .28)" : "rgba(214, 208, 194, .35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // Дрібні порошинки
      var specks = Math.round((w * h) / 260);
      for (var j = 0; j < specks; j++) {
        ctx.fillStyle = r() > 0.5 ? "rgba(90, 82, 68, .22)" : "rgba(240, 236, 226, .3)";
        var s = r() * 2.2 + 0.4;
        ctx.fillRect(r() * w, r() * h, s, s);
      }
      // Ворсинки
      ctx.strokeStyle = "rgba(95, 86, 70, .25)";
      ctx.lineWidth = 1;
      for (var k = 0; k < 40; k++) {
        var fx = r() * w, fy = r() * h;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(fx + (r() - .5) * 30, fy + (r() - .5) * 30, fx + (r() - .5) * 40, fy + (r() - .5) * 40);
        ctx.stroke();
      }

      cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
      cells = new Uint8Array(cols * rows);
      cleanedCount = 0;
      last = null;
    }

    function markCells(x, y) {
      var c0 = Math.max(0, Math.floor((x - BRUSH * .7) / CELL));
      var c1 = Math.min(cols - 1, Math.floor((x + BRUSH * .7) / CELL));
      var r0 = Math.max(0, Math.floor((y - BRUSH * .7) / CELL));
      var r1 = Math.min(rows - 1, Math.floor((y + BRUSH * .7) / CELL));
      for (var ry = r0; ry <= r1; ry++) {
        for (var cx = c0; cx <= c1; cx++) {
          var idx = ry * cols + cx;
          if (!cells[idx]) { cells[idx] = 1; cleanedCount++; }
        }
      }
    }

    function wipe(x, y) {
      if (isClean) return;
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      var from = last || { x: x - 0.1, y: y };
      // м'який край
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = BRUSH * 2.3;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(x, y); ctx.stroke();
      // чисте ядро
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = BRUSH * 1.6;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(x, y); ctx.stroke();

      // відмічаємо клітинки вздовж відрізка
      var dist = Math.hypot(x - from.x, y - from.y);
      var steps = Math.max(1, Math.ceil(dist / (CELL / 2)));
      for (var i = 0; i <= steps; i++) {
        markCells(from.x + (x - from.x) * i / steps, from.y + (y - from.y) * i / steps);
      }
      last = { x: x, y: y };

      if (cleanedCount / cells.length >= DONE_AT) finish();
    }

    function finish() {
      isClean = true;
      canvas.classList.add("is-clean");
      if (hint) hint.classList.add("is-done");
      if (hintText) hintText.textContent = "Чисто. Так буде і у вас удома";
    }

    function point(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    var pressing = false;
    // Миша протирає просто при русі; палець і стилус — при натисканні
    canvas.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" || pressing) {
        var p = point(e); wipe(p.x, p.y);
      }
    });
    canvas.addEventListener("pointerdown", function (e) {
      pressing = true; last = null;
      var p = point(e); wipe(p.x, p.y);
    });
    ["pointerup", "pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { pressing = false; last = null; });
    });
    canvas.addEventListener("pointerleave", function () { last = null; pressing = false; });

    // Перемальовуємо пил, якщо змінилась ширина (поки не протерто)
    var lastW = 0, lastH = 0;
    function onResize() {
      var rect = card.getBoundingClientRect();
      if (isClean || (Math.abs(rect.width - lastW) < 2 && Math.abs(rect.height - lastH) < 2)) return;
      lastW = rect.width; lastH = rect.height;
      paintDust();
    }
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(card);
    else window.addEventListener("resize", onResize);
    onResize();

    // Демонстраційний мазок — після повного завантаження сторінки й шрифтів,
    // щоб розкладка вже не змінювалась і пил не перемальовувався посеред мазка
    function whenSettled(cb) {
      var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      var loaded = document.readyState === "complete"
        ? Promise.resolve()
        : new Promise(function (res) { window.addEventListener("load", res, { once: true }); });
      Promise.all([fonts, loaded]).then(function () { setTimeout(cb, 350); });
    }
    if (!reduceMotion) {
      var t0 = null, DURATION = 1300;
      whenSettled(function () {
        onResize();
        last = null;
        requestAnimationFrame(function step(ts) {
          if (t0 === null) t0 = ts;
          var t = Math.min(1, (ts - t0) / DURATION);
          var e = 1 - Math.pow(1 - t, 3);
          var x = w * (0.52 + 0.44 * e);
          var y = h * (0.82 - 0.62 * e) + Math.sin(e * Math.PI * 3) * 26;
          wipe(x, y);
          if (t < 1 && !pressing) requestAnimationFrame(step);
          else last = null;
        });
      });
    }
  }

  /* ======================================================
     2. Калькулятор вартості
     ====================================================== */
  var form = document.querySelector("form.order");
  if (form) {
    var areaNum = form.querySelector("#area");
    var areaRange = document.getElementById("area-range");
    var windows = form.querySelector("#windows");
    var totalEl = form.querySelector("[data-total]");
    var linesEl = form.querySelector("[data-lines]");
    var estimate = form.querySelector('input[name="estimate"]');

    function clampInt(v, min, max) {
      v = parseInt(v, 10);
      if (isNaN(v)) v = min;
      return Math.min(max, Math.max(min, v));
    }

    function calc() {
      var typeInput = form.querySelector('input[name="type"]:checked');
      var plan = PRICING[typeInput.dataset.key];
      var area = clampInt(areaNum.value || 0, 0, 500);
      var lines = [];

      var base = Math.max(plan.min, area * plan.perM2);
      lines.push([plan.label + ", " + area + " м²", base]);

      var win = clampInt(windows.value, 0, 40);
      if (win > 0) lines.push(["Вікна × " + win, win * WINDOW_PRICE]);

      form.querySelectorAll('input[name="extras"]:checked').forEach(function (cb) {
        lines.push([cb.value, parseInt(cb.dataset.price, 10)]);
      });

      var total = lines.reduce(function (s, l) { return s + l[1]; }, 0);
      totalEl.textContent = fmt.format(total);
      linesEl.innerHTML = "";
      lines.forEach(function (l) {
        var li = document.createElement("li");
        var a = document.createElement("span"); a.textContent = l[0];
        var b = document.createElement("span"); b.textContent = fmt.format(l[1]) + " грн";
        li.append(a, b);
        linesEl.appendChild(li);
      });
      if (area * plan.perM2 < plan.min) {
        var note = document.createElement("li");
        note.innerHTML = "<span>Мінімальне замовлення</span><span></span>";
        note.style.opacity = ".6";
        linesEl.appendChild(note);
      }
      estimate.value = fmt.format(total) + " грн — " + lines.map(function (l) { return l[0]; }).join("; ");
    }

    areaRange.addEventListener("input", function () { areaNum.value = areaRange.value; calc(); });
    areaNum.addEventListener("input", function () {
      areaRange.value = Math.min(250, Math.max(20, parseInt(areaNum.value, 10) || 20));
      calc();
    });
    areaNum.addEventListener("blur", function () { areaNum.value = clampInt(areaNum.value, 20, 500); calc(); });

    form.querySelectorAll("[data-step]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        windows.value = clampInt(windows.value, 0, 40) + parseInt(btn.dataset.step, 10);
        windows.value = clampInt(windows.value, 0, 40);
        calc();
      });
    });
    form.addEventListener("change", calc);
    form.addEventListener("input", function (e) { if (e.target === windows) calc(); });

    // Кнопки «Обрати …» у картках послуг
    document.querySelectorAll("[data-pick]").forEach(function (link) {
      link.addEventListener("click", function () {
        var radio = form.querySelector('input[name="type"][data-key="' + link.dataset.pick + '"]');
        if (radio) { radio.checked = true; calc(); }
      });
    });

    // Дата — не раніше сьогодні
    var date = form.querySelector("#date");
    if (date) {
      var d = new Date();
      date.min = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    calc();
  }

  /* ---------- Рік у підвалі ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
