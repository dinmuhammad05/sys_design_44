/* ==========================================================================
   Kurs — umumiy JS: navigatsiya, progress-tracking, active-state.
   Barcha sahifalar (index va darslar) shu bitta faylni ishlatadi.

   Yangi dars qo'shish uchun:
     1) assets/lessons.json ga bitta yozuv qo'shing;
     2) X.Y-nomi.html faylini yarating va <html data-dars="X.Y"> qiling.
   Boshqa hech qanday kodni o'zgartirish shart emas.
   ========================================================================== */

(function () {
  "use strict";

  var STORE_KEY = "kurs.progress.v1";
  var DATA_URL = "assets/lessons.json";

  /* ---------- localStorage yordamchilari (xavfsiz o'rash) ---------- */

  function readProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {}; // private mode / bloklangan storage
    }
  }

  function writeProgress(obj) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (e) {
      /* jim o'tamiz: progress — qo'shimcha qulaylik, majburiy emas */
    }
  }

  function isDone(id) {
    return readProgress()[id] === true;
  }

  function setDone(id, value) {
    var p = readProgress();
    if (value) { p[id] = true; } else { delete p[id]; }
    writeProgress(p);
  }

  /* ---------- Kichik DOM yordamchilari ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s);
  }

  /* ---------- Ma'lumotni yuklash ---------- */

  function loadLessons() {
    return fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("lessons.json yuklanmadi: HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.darslar) || [];
        // tartib bo'yicha barqaror saralash: avval asosiy mavzu, keyin tartib
        list = list.slice().sort(function (a, b) {
          if (a.asosiyId !== b.asosiyId) return a.asosiyId - b.asosiyId;
          return (a.tartib || 0) - (b.tartib || 0);
        });
        return { kurs: (data && data.kurs) || {}, darslar: list };
      });
  }

  /* ---------- Progress ko'rsatkichi ---------- */

  function renderProgressInto(node, darslar) {
    if (!node) return;
    var total = darslar.length;
    var done = darslar.filter(function (d) { return isDone(d.ichkiId); }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    node.innerHTML = "";
    var track = el("div", "progress__track");
    var fill = el("span", "progress__fill");
    fill.style.width = pct + "%";
    track.appendChild(fill);
    node.appendChild(track);
    node.appendChild(el("span", null, done + "/" + total + " dars tugallandi"));
    node.setAttribute("role", "status");
  }

  /* ======================================================================
     INDEX sahifasi
     ====================================================================== */

  function renderIndex(data) {
    var root = document.querySelector("[data-kurs-royxat]");
    if (!root) return;
    var darslar = data.darslar;

    root.innerHTML = "";

    if (!darslar.length) {
      root.appendChild(el("div", "empty-state", "Hozircha darslar yo'q. assets/lessons.json fayliga yozuv qo'shing."));
      return;
    }

    // asosiy mavzu bo'yicha guruhlash (tartibni saqlagan holda)
    var groups = [];
    var index = {};
    darslar.forEach(function (d) {
      var key = String(d.asosiyId);
      if (!index[key]) {
        index[key] = { id: d.asosiyId, nomi: d.asosiyNomi, tavsif: d.asosiyTavsif, items: [] };
        groups.push(index[key]);
      }
      index[key].items.push(d);
    });

    groups.forEach(function (g) {
      var sec = el("section", "module");
      sec.id = "mavzu-" + g.id;

      var head = el("div", "module__head");
      head.appendChild(el("span", "module__num", String(g.id)));
      head.appendChild(el("h2", "module__title", esc(g.nomi)));
      var doneCount = g.items.filter(function (d) { return isDone(d.ichkiId); }).length;
      head.appendChild(el("span", "module__count", doneCount + "/" + g.items.length));
      sec.appendChild(head);

      if (g.tavsif) sec.appendChild(el("p", "module__desc", esc(g.tavsif)));

      var cards = el("div", "cards");
      g.items.forEach(function (d) {
        var a = el("a", "card");
        a.href = d.fayl;
        if (isDone(d.ichkiId)) a.classList.add("is-done");

        var top = el("div", "card__top");
        top.appendChild(el("span", "card__id", esc(d.ichkiId)));
        if (isDone(d.ichkiId)) top.appendChild(el("span", "card__check", "✓ o'qildi"));
        a.appendChild(top);

        a.appendChild(el("div", "card__title", esc(d.ichkiNomi)));
        if (d.ichkiTavsif) a.appendChild(el("p", "card__desc", esc(d.ichkiTavsif)));
        if (d.davomiyligi) a.appendChild(el("div", "card__meta", "≈ " + esc(d.davomiyligi)));

        cards.appendChild(a);
      });
      sec.appendChild(cards);
      root.appendChild(sec);
    });

    // Statistika va progress
    renderProgressInto(document.querySelector("[data-progress]"), darslar);

    var stats = document.querySelector("[data-stats]");
    if (stats) {
      stats.innerHTML = "";
      var doneAll = darslar.filter(function (d) { return isDone(d.ichkiId); }).length;
      [
        [String(groups.length), "asosiy mavzu"],
        [String(darslar.length), "ichki mavzu (dars)"],
        [doneAll + "/" + darslar.length, "tugallangan"]
      ].forEach(function (pair) {
        var s = el("div", "stat");
        s.appendChild(el("div", "stat__num", pair[0]));
        s.appendChild(el("div", "stat__label", pair[1]));
        stats.appendChild(s);
      });
    }

    // "Davom etish" tugmasi — birinchi o'qilmagan darsga
    var cont = document.querySelector("[data-davom]");
    if (cont) {
      var next = darslar.filter(function (d) { return !isDone(d.ichkiId); })[0];
      var target = next || darslar[0];
      cont.href = target.fayl;
      cont.textContent = next
        ? (darslar.some(function (d) { return isDone(d.ichkiId); }) ? "Davom etish → " + next.ichkiId : "Boshlash → " + next.ichkiId)
        : "Qaytadan ko'rish → " + target.ichkiId;
      cont.hidden = false;
    }

    // Progressni tozalash tugmasi
    var reset = document.querySelector("[data-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!confirm("Progress tozalansinmi? Barcha 'o'qildi' belgilari o'chiriladi.")) return;
        writeProgress({});
        renderIndex(data);
      });
    }
  }

  /* ======================================================================
     DARS sahifasi
     ====================================================================== */

  function renderLesson(data, darsId) {
    var darslar = data.darslar;
    var i = -1;
    darslar.forEach(function (d, k) { if (d.ichkiId === darsId) i = k; });

    var cur = i >= 0 ? darslar[i] : null;
    var prev = i > 0 ? darslar[i - 1] : null;
    var next = i >= 0 && i < darslar.length - 1 ? darslar[i + 1] : null;

    /* --- Yuqori panel --- */
    var bar = document.querySelector("[data-topbar]");
    if (bar) {
      bar.innerHTML = "";
      var inner = el("div", "topbar__inner");

      var back = el("a", "topbar__back", "← Kurs");
      back.href = "index.html";
      inner.appendChild(back);

      var title = el("div", "topbar__title");
      if (cur) {
        title.innerHTML = "";
        title.appendChild(document.createTextNode(cur.asosiyNomi + " / "));
        var b = el("b", null, cur.ichkiId + " " + cur.ichkiNomi);
        title.appendChild(b);
      }
      inner.appendChild(title);

      var nav = el("div", "topbar__nav");

      var pBtn = el("a", "btn", "← Oldingi");
      if (prev) { pBtn.href = prev.fayl; pBtn.title = prev.ichkiId + " " + prev.ichkiNomi; }
      else { pBtn.classList.add("is-disabled"); pBtn.setAttribute("aria-disabled", "true"); }
      nav.appendChild(pBtn);

      var nBtn = el("a", "btn btn--primary", "Keyingi →");
      if (next) { nBtn.href = next.fayl; nBtn.title = next.ichkiId + " " + next.ichkiNomi; }
      else { nBtn.classList.add("is-disabled"); nBtn.setAttribute("aria-disabled", "true"); }
      nav.appendChild(nBtn);

      inner.appendChild(nav);
      bar.appendChild(inner);
    }

    /* --- Sarlavha ustidagi "eyebrow" (asosiy mavzu nomi) --- */
    var eyebrow = document.querySelector("[data-eyebrow]");
    if (eyebrow && cur) {
      eyebrow.textContent = "Asosiy mavzu " + cur.asosiyId + " · " + cur.asosiyNomi +
        (cur.davomiyligi ? "  ·  ≈ " + cur.davomiyligi : "");
    }

    /* --- Bo'limlarni raqamlash + mundarija --- */
    var article = document.querySelector(".lesson");
    var heads = article ? article.querySelectorAll("h2") : [];
    var toc = document.querySelector("[data-toc]");
    if (heads.length) {
      var ol = el("ol");
      Array.prototype.forEach.call(heads, function (h, k) {
        if (!h.id) {
          h.id = "bolim-" + (k + 1);
        }
        if (!h.querySelector(".h2num")) {
          var num = el("span", "h2num", "§" + (k + 1));
          h.insertBefore(num, h.firstChild);
        }
        if (toc) {
          var li = el("li");
          var a = el("a", null, h.textContent.replace(/^§\d+\s*/, ""));
          a.href = "#" + h.id;
          li.appendChild(a);
          ol.appendChild(li);
        }
      });
      if (toc) {
        toc.innerHTML = "";
        toc.appendChild(el("div", "toc__title", "Ushbu darsda"));
        toc.appendChild(ol);
      }
    }

    /* --- "O'qildi" tugmasi --- */
    var doneBar = document.querySelector("[data-done-bar]");
    if (doneBar && cur) {
      doneBar.innerHTML = "";
      var btn = el("button", "btn");
      var label = el("span", null, "");

      function sync() {
        var done = isDone(cur.ichkiId);
        btn.className = "btn" + (done ? " btn--done" : "");
        btn.textContent = done ? "✓ O'qildi" : "O'qildi deb belgilash";
        var all = darslar.length;
        var d = darslar.filter(function (x) { return isDone(x.ichkiId); }).length;
        label.textContent = "Umumiy progress: " + d + "/" + all + " dars";
      }

      btn.addEventListener("click", function () {
        setDone(cur.ichkiId, !isDone(cur.ichkiId));
        sync();
      });

      sync();
      doneBar.appendChild(btn);
      doneBar.appendChild(label);
    }

    /* --- Sahifa oxiridagi oldingi/keyingi --- */
    var footNav = document.querySelector("[data-lesson-nav]");
    if (footNav) {
      footNav.innerHTML = "";
      if (prev) {
        var pa = el("a", "lesson-nav__link");
        pa.href = prev.fayl;
        pa.appendChild(el("span", "lesson-nav__dir", "← Oldingi dars"));
        pa.appendChild(el("span", "lesson-nav__name", prev.ichkiId + " " + prev.ichkiNomi));
        footNav.appendChild(pa);
      }
      if (next) {
        var na = el("a", "lesson-nav__link lesson-nav__link--next");
        na.href = next.fayl;
        na.appendChild(el("span", "lesson-nav__dir", "Keyingi dars →"));
        na.appendChild(el("span", "lesson-nav__name", next.ichkiId + " " + next.ichkiNomi));
        footNav.appendChild(na);
      } else {
        var end = el("a", "lesson-nav__link lesson-nav__link--next");
        end.href = "index.html";
        end.appendChild(el("span", "lesson-nav__dir", "Bu — oxirgi mavjud dars"));
        end.appendChild(el("span", "lesson-nav__name", "Kurs sahifasiga qaytish →"));
        footNav.appendChild(end);
      }
    }

    /* --- Klaviatura: ← / → bilan darslar orasida yurish --- */
    document.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev) location.href = prev.fayl;
      if (e.key === "ArrowRight" && next) location.href = next.fayl;
    });
  }

  /* ======================================================================
     Ishga tushirish
     ====================================================================== */

  function boot() {
    var darsId = document.documentElement.getAttribute("data-dars");
    var isIndex = document.body.getAttribute("data-page") === "index";

    loadLessons().then(function (data) {
      if (isIndex) renderIndex(data);
      if (darsId) renderLesson(data, darsId);
    }).catch(function (err) {
      // fetch ishlamasa (masalan file:// orqali ochilganda) — sahifa baribir o'qilishi kerak
      console.warn("[kurs]", err.message);
      var root = document.querySelector("[data-kurs-royxat]");
      if (root && !root.children.length) {
        root.appendChild(el("div", "empty-state",
          "Darslar ro'yxatini yuklab bo'lmadi. Sahifa file:// orqali ochilgan bo'lsa, brauzer fetch'ni bloklaydi — " +
          "lokal server ishlating (masalan: python3 -m http.server) yoki GitHub Pages'da oching."));
      }
      var bar = document.querySelector("[data-topbar]");
      if (bar && !bar.children.length) {
        var inner = el("div", "topbar__inner");
        var back = el("a", "topbar__back", "← Kurs");
        back.href = "index.html";
        inner.appendChild(back);
        bar.appendChild(inner);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
