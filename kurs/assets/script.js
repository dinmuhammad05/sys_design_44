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
        end.appendChild(el("span", "lesson-nav__dir", "Bu — oxirgi mavjud dars · davomi tez orada"));
        end.appendChild(el("span", "lesson-nav__name", "Kurs sahifasiga qaytish →"));
        footNav.appendChild(end);
      }
    }

    /* --- O'qish rejimi (bo'limlar, yon mundarija, sozlamalar tugmasi) --- */
    setupReader(darsId);
    placePrefsButton();

    /* --- Klaviatura: ← / → bilan darslar orasida yurish --- */
    document.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (readerKey(e.key)) return;               // bo'limlar orasida yurish
      if (e.key === "ArrowLeft" && prev) location.href = prev.fayl;
      if (e.key === "ArrowRight" && next) location.href = next.fayl;
    });
  }



  /* ======================================================================
     O'QISH TAJRIBASI
     - sozlamalar: mavzu (qorong'i/yorug'/sepiya), shrift, o'lcham, kenglik, rejim
     - bo'limma-bo'lim rejim: dars h2 bo'yicha bo'linadi, bittasi ko'rinadi
     - yon mundarija (keng ekranda) / pastki panel (mobil)
     - yuqoridagi o'qish progressi
     ====================================================================== */

  var PREFS_KEY = "kurs.prefs.v1";
  var CHAP_KEY  = "kurs.chapters.v1";
  var DEFAULT_PREFS = { theme: "dark", font: "sans", size: 18, width: "orta", mode: "bolim" };
  var WIDTHS = { tor: "660px", orta: "760px", keng: "900px" };
  var prefs = loadPrefs();

  function loadPrefs() {
    try {
      var raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return Object.assign({}, DEFAULT_PREFS, raw && typeof raw === "object" ? raw : {});
    } catch (e) { return Object.assign({}, DEFAULT_PREFS); }
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function applyPrefs() {
    var root = document.documentElement;
    root.setAttribute("data-theme", prefs.theme);
    root.setAttribute("data-font", prefs.font);
    root.setAttribute("data-mode", prefs.mode);
    root.style.setProperty("--text-size", prefs.size + "px");
    root.style.setProperty("--measure", WIDTHS[prefs.width] || WIDTHS.orta);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = prefs.theme === "light" ? "#f6f7f9" : prefs.theme === "sepia" ? "#f3ead8" : "#0d1117";
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.content = prefs.theme === "dark" ? "dark" : "light";
  }

  function setPref(key, value) {
    prefs[key] = value;
    savePrefs();
    applyPrefs();
    if (key === "mode") applyMode();
    if (key === "width") layoutSideToc();
    syncPrefsUI();
  }

  /* --- Sozlamalar paneli --- */
  var prefsPanel = null;

  function seg(options, key) {
    var box = el("div", "seg");
    options.forEach(function (o) {
      var b = el("button", null, o[1]);
      b.type = "button";
      b.dataset.key = key;
      b.dataset.val = String(o[0]);
      b.addEventListener("click", function () { setPref(key, o[0]); });
      box.appendChild(b);
    });
    return box;
  }

  function row(label, control) {
    var r = el("div", "prefs__row");
    r.appendChild(el("span", "prefs__label", label));
    r.appendChild(control);
    return r;
  }

  function buildPrefsPanel() {
    var panel = el("div", "prefs");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "O'qish sozlamalari");

    panel.appendChild(row("Mavzu", seg([["dark", "Qorong'i"], ["light", "Yorug'"], ["sepia", "Sepiya"]], "theme")));
    panel.appendChild(row("Shrift", seg([["sans", "Sans"], ["serif", "Serif"]], "font")));

    var sizeBox = el("div", "seg");
    var minus = el("button", null, "A−"); minus.type = "button";
    var val = el("button", null, ""); val.type = "button"; val.disabled = true; val.dataset.role = "size";
    var plus = el("button", null, "A+"); plus.type = "button";
    minus.addEventListener("click", function () { setPref("size", Math.max(15, prefs.size - 1)); });
    plus.addEventListener("click", function () { setPref("size", Math.min(23, prefs.size + 1)); });
    sizeBox.appendChild(minus); sizeBox.appendChild(val); sizeBox.appendChild(plus);
    panel.appendChild(row("O'lcham", sizeBox));

    panel.appendChild(row("Kenglik", seg([["tor", "Tor"], ["orta", "O'rta"], ["keng", "Keng"]], "width")));

    if (document.documentElement.hasAttribute("data-dars")) {
      panel.appendChild(row("Rejim", seg([["bolim", "Bo'limma-bo'lim"], ["tolik", "To'liq sahifa"]], "mode")));
      panel.appendChild(el("p", "prefs__hint",
        "Bo'limma-bo'lim rejimida dars kichik qismlarga bo'linadi va ← → tugmalari bo'limlar orasida yuradi."));
    }

    document.body.appendChild(panel);
    document.addEventListener("click", function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || (e.target.closest && e.target.closest(".btn--prefs"))) return;
      panel.hidden = true;
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") panel.hidden = true; });
    return panel;
  }

  function syncPrefsUI() {
    if (!prefsPanel) return;
    Array.prototype.forEach.call(prefsPanel.querySelectorAll(".seg button[data-key]"), function (b) {
      b.classList.toggle("is-on", String(prefs[b.dataset.key]) === b.dataset.val);
    });
    var v = prefsPanel.querySelector('[data-role="size"]');
    if (v) v.textContent = prefs.size + "px";
  }

  function placePrefsButton() {
    var nav = topbarNav();
    if (!nav || nav.querySelector(".btn--prefs")) return;
    if (!prefsPanel) prefsPanel = buildPrefsPanel();
    var b = el("button", "btn btn--prefs", "Aa");
    b.type = "button";
    b.title = "O'qish sozlamalari: mavzu, shrift, o'lcham, rejim";
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("click", function () {
      prefsPanel.hidden = !prefsPanel.hidden;
      if (!prefsPanel.hidden) syncPrefsUI();
    });
    nav.insertBefore(b, nav.firstChild);
    syncPrefsUI();
  }

  /* --- Bo'limlar (chapters) --- */
  var reader = { id: null, chapters: [], cur: 0, side: null, bar: null, progress: null, spy: null };

  function chapterState() {
    try { return JSON.parse(localStorage.getItem(CHAP_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveChapterState(cur, seen) {
    try {
      var all = chapterState();
      all[reader.id] = { cur: cur, seen: seen };
      localStorage.setItem(CHAP_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function headingText(h) {
    return h ? h.textContent.replace(/^§\d+\s*/, "").trim() : "";
  }

  function readMinutes(node) {
    var words = (node.innerText || node.textContent || "").split(/\s+/).length;
    return Math.max(1, Math.round(words / 170));
  }

  function setupReader(darsId) {
    var article = document.querySelector(".lesson");
    if (!article || article.dataset.readerReady) return;
    article.dataset.readerReady = "1";
    reader.id = darsId || location.pathname.split("/").pop();

    // 1) Bolalarni bo'limlarga ajratamiz: har bir h2 (yoki .summary) — yangi bo'lim
    var kids = Array.prototype.slice.call(article.children);
    var intro = [], chapters = [], curr = null;
    kids.forEach(function (node) {
      var isBoundary = node.tagName === "H2" || (node.classList && node.classList.contains("summary"));
      if (isBoundary) {
        curr = { nodes: [node], h2: node.tagName === "H2" ? node : node.querySelector("h2") };
        chapters.push(curr);
      } else if (curr) {
        curr.nodes.push(node);
      } else {
        intro.push(node);
      }
    });
    if (chapters.length < 2) return;           // bo'lishga arzimaydi
    chapters[0].nodes = intro.concat(chapters[0].nodes);

    // 2) DOM: har bir bo'limni <section class="chapter"> ga o'raymiz
    chapters.forEach(function (ch, i) {
      var sec = el("section", "chapter");
      sec.dataset.ch = String(i);
      article.insertBefore(sec, ch.nodes[0]);
      ch.nodes.forEach(function (n) { sec.appendChild(n); });
      ch.el = sec;
      ch.title = headingText(ch.h2);
      ch.minutes = readMinutes(sec);
    });
    reader.chapters = chapters;

    // 3) Har bir bo'limga ko'rsatkich va oldingi/keyingi tugmalar
    chapters.forEach(function (ch, i) {
      var kicker = el("p", "chapter-kicker");
      kicker.innerHTML = "<b>Bo'lim " + (i + 1) + "/" + chapters.length + "</b> · ≈ " + ch.minutes + " daqiqa";
      // kirish qismi bo'lsa — h2 dan oldin, aks holda boshiga
      ch.el.insertBefore(kicker, ch.h2.closest(".summary") || ch.h2);

      var nav = el("div", "chapter-nav");
      if (i > 0) {
        var pb = el("button", "chapter-nav__btn");
        pb.type = "button";
        pb.appendChild(el("span", "chapter-nav__dir", "← Oldingi bo'lim"));
        pb.appendChild(el("span", "chapter-nav__name", chapters[i - 1].title));
        pb.addEventListener("click", function () { showChapter(i - 1, true); });
        nav.appendChild(pb);
      }
      if (i < chapters.length - 1) {
        var nb = el("button", "chapter-nav__btn chapter-nav__btn--next");
        nb.type = "button";
        nb.appendChild(el("span", "chapter-nav__dir", "Keyingi bo'lim →"));
        nb.appendChild(el("span", "chapter-nav__name", chapters[i + 1].title));
        nb.addEventListener("click", function () { showChapter(i + 1, true); });
        nav.appendChild(nb);
      }
      // oxirgi bo'limda dars navigatsiyasi bor — bo'lim tugmalarini undan oldin qo'yamiz
      var before = ch.el.querySelector(".done-bar");
      if (before) ch.el.insertBefore(nav, before); else ch.el.appendChild(nav);
    });

    // 4) Yon mundarija, mobil panel, progress
    buildSideToc();
    buildReaderBar();
    buildProgress();

    // 5) Boshlang'ich bo'lim: hash → saqlangan holat → 0
    var st = chapterState()[reader.id] || {};
    var start = typeof st.cur === "number" ? st.cur : 0;
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) { var sec = target.closest(".chapter"); if (sec) start = +sec.dataset.ch; }
    reader.cur = Math.min(Math.max(start, 0), chapters.length - 1);

    applyMode();

    window.addEventListener("hashchange", function () {
      var t = location.hash && document.getElementById(location.hash.slice(1));
      if (!t) return;
      var sec = t.closest(".chapter");
      if (sec && prefs.mode === "bolim" && +sec.dataset.ch !== reader.cur) {
        showChapter(+sec.dataset.ch, false);
        t.scrollIntoView({ block: "start" });
      }
    });
    window.addEventListener("resize", layoutSideToc);
  }

  function markSeen(i) {
    var st = chapterState()[reader.id] || {};
    var seen = Array.isArray(st.seen) ? st.seen.slice() : [];
    if (seen.indexOf(i) < 0) seen.push(i);
    saveChapterState(i, seen);
    return seen;
  }

  function showChapter(i, scrollTop) {
    var chs = reader.chapters;
    if (!chs.length) return;
    i = Math.min(Math.max(i, 0), chs.length - 1);
    reader.cur = i;
    chs.forEach(function (ch, k) { ch.el.hidden = prefs.mode === "bolim" && k !== i; });
    var seen = markSeen(i);
    updateSideToc(i, seen);
    updateReaderBar(i);
    if (scrollTop) {
      var top = document.querySelector(".lesson").getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    }
    updateProgress();
  }

  function applyMode() {
    if (!reader.chapters.length) return;
    if (prefs.mode === "bolim") {
      if (reader.spy) { reader.spy.disconnect(); reader.spy = null; }
      showChapter(reader.cur, false);
    } else {
      reader.chapters.forEach(function (ch) { ch.el.hidden = false; });
      updateSideToc(reader.cur, (chapterState()[reader.id] || {}).seen || []);
      startScrollSpy();
    }
    layoutSideToc();
    updateProgress();
  }

  /* Yon mundarija */
  function buildSideToc() {
    var side = el("aside", "side-toc");
    side.appendChild(el("div", "side-toc__title", "Bo'limlar"));
    var ol = el("ol");
    reader.chapters.forEach(function (ch, i) {
      var li = el("li");
      var b = el("button");
      b.type = "button";
      b.appendChild(el("span", "side-toc__num", String(i + 1)));
      b.appendChild(el("span", null, ch.title));
      b.addEventListener("click", function () {
        if (prefs.mode === "bolim") {
          showChapter(i, true);
        } else {
          markSeen(i);
          ch.h2.scrollIntoView({ block: "start" });
        }
        if (side.classList.contains("is-sheet")) side.hidden = true;
      });
      li.appendChild(b);
      ol.appendChild(li);
    });
    side.appendChild(ol);
    side.appendChild(el("div", "side-toc__foot", ""));
    document.body.appendChild(side);
    reader.side = side;
  }

  function updateSideToc(active, seen) {
    if (!reader.side) return;
    var items = reader.side.querySelectorAll("li");
    Array.prototype.forEach.call(items, function (li, k) {
      li.classList.toggle("is-active", k === active);
      li.classList.toggle("is-seen", seen.indexOf(k) >= 0);
    });
    var foot = reader.side.querySelector(".side-toc__foot");
    if (foot) foot.textContent = seen.length + "/" + reader.chapters.length + " bo'lim o'qildi";
  }

  /* Yon panel sig'adimi? Sig'masa — mobil panel + ochiladigan ro'yxat */
  function layoutSideToc() {
    if (!reader.side) return;
    var measure = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--measure"), 10) || 760;
    var fits = window.innerWidth >= measure + 520;   // 1280px ekranda "o'rta" kenglik bilan sig'adi
    reader.side.classList.toggle("is-sheet", !fits);
    if (fits) {
      reader.side.hidden = false;
      if (reader.bar) reader.bar.style.display = "none";
      document.body.classList.remove("has-reader-bar");
    } else {
      reader.side.hidden = true;               // faqat tugma bosilganda ochiladi
      if (reader.bar) reader.bar.style.display = prefs.mode === "bolim" ? "flex" : "none";
      document.body.classList.toggle("has-reader-bar", prefs.mode === "bolim");
    }
  }

  /* Mobil pastki panel */
  function buildReaderBar() {
    var bar = el("div", "reader-bar");
    var prev = el("button", "btn", "←"); prev.type = "button"; prev.title = "Oldingi bo'lim";
    var mid = el("button", "reader-bar__mid"); mid.type = "button";
    mid.appendChild(el("small", null, "")); mid.appendChild(el("span", null, ""));
    var next = el("button", "btn btn--primary", "→"); next.type = "button"; next.title = "Keyingi bo'lim";
    prev.addEventListener("click", function () { if (reader.cur > 0) showChapter(reader.cur - 1, true); });
    next.addEventListener("click", function () { if (reader.cur < reader.chapters.length - 1) showChapter(reader.cur + 1, true); });
    mid.addEventListener("click", function () {
      if (!reader.side) return;
      reader.side.hidden = !reader.side.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!reader.side || reader.side.hidden || !reader.side.classList.contains("is-sheet")) return;
      if (reader.side.contains(e.target) || mid.contains(e.target)) return;
      reader.side.hidden = true;
    });
    bar.appendChild(prev); bar.appendChild(mid); bar.appendChild(next);
    document.body.appendChild(bar);
    reader.bar = bar;
  }

  function updateReaderBar(i) {
    if (!reader.bar) return;
    var chs = reader.chapters;
    reader.bar.querySelector("small").textContent = "Bo'lim " + (i + 1) + " / " + chs.length + " · ro'yxat";
    reader.bar.querySelector("span").textContent = chs[i].title;
    var btns = reader.bar.querySelectorAll(".btn");
    btns[0].classList.toggle("is-disabled", i === 0);
    btns[1].classList.toggle("is-disabled", i === chs.length - 1);
  }

  /* To'liq sahifa rejimida: qaysi bo'lim ko'rinib turibdi */
  function startScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    var map = {};
    reader.chapters.forEach(function (ch, i) { map[ch.h2.id] = i; });
    reader.spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = map[en.target.id];
        if (typeof i !== "number") return;
        reader.cur = i;
        var seen = markSeen(i);
        updateSideToc(i, seen);
      });
    }, { rootMargin: "-10% 0px -70% 0px", threshold: 0 });
    reader.chapters.forEach(function (ch) { reader.spy.observe(ch.h2); });
  }

  /* Yuqoridagi progress chizig'i */
  function buildProgress() {
    var bar = el("div", "read-progress");
    document.body.appendChild(bar);
    reader.progress = bar;
    window.addEventListener("scroll", updateProgress, { passive: true });
  }

  function updateProgress() {
    if (!reader.progress) return;
    var scope = prefs.mode === "bolim" && reader.chapters[reader.cur]
      ? reader.chapters[reader.cur].el
      : document.querySelector(".lesson");
    if (!scope) return;
    var rect = scope.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var total = Math.max(1, rect.height - window.innerHeight * 0.6);
    var pct = Math.min(100, Math.max(0, ((window.scrollY - top) / total) * 100));
    reader.progress.style.width = pct + "%";
  }

  /* Klaviatura: bo'limma-bo'lim rejimida ← → bo'limlar orasida yuradi.
     Chetga chiqqanda — dars o'zgaradi. true qaytarsa, hodisa ishlangan. */
  function readerKey(key) {
    if (!reader.chapters.length || prefs.mode !== "bolim") return false;
    if (key === "ArrowRight" && reader.cur < reader.chapters.length - 1) { showChapter(reader.cur + 1, true); return true; }
    if (key === "ArrowLeft" && reader.cur > 0) { showChapter(reader.cur - 1, true); return true; }
    return false;
  }

  /* ======================================================================
     PWA: ilova sifatida o'rnatish va oflayn rejim
     ====================================================================== */

  var deferredPrompt = null;   // beforeinstallprompt hodisasi
  var installBtn = null;
  var offlineNoticeShown = false;

  function isStandalone() {
    try {
      return window.matchMedia("(display-mode: standalone)").matches ||
             window.matchMedia("(display-mode: minimal-ui)").matches ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
           // iPadOS 13+ o'zini Mac deb ko'rsatadi
           (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  /* Yuqori paneldagi tugmalar qutisi (dars sahifalarida JS yaratadi) */
  function topbarNav() {
    var nav = document.querySelector(".topbar__nav");
    if (nav) return nav;
    var inner = document.querySelector(".topbar__inner");
    if (!inner) return null;
    nav = el("div", "topbar__nav");
    inner.appendChild(nav);
    return nav;
  }

  function toast(message, actionText, onAction) {
    var box = el("div", "toast");
    box.appendChild(el("span", null, message));
    if (actionText) {
      var b = el("button", "btn btn--primary", actionText);
      b.addEventListener("click", function () {
        box.remove();
        if (onAction) onAction();
      });
      box.appendChild(b);
    }
    var close = el("button", "toast__close", "✕");
    close.setAttribute("aria-label", "Yopish");
    close.addEventListener("click", function () { box.remove(); });
    box.appendChild(close);
    document.body.appendChild(box);
    return box;
  }

  function showIosHint() {
    if (document.querySelector(".ios-hint")) return;
    var box = el("div", "ios-hint");
    box.innerHTML =
      '<b>iPhone / iPad'+"'"+'da o'+"'"+'rnatish</b>' +
      '<ol><li>Pastdagi <b>Ulashish</b> tugmasini bosing (kvadrat va yuqoriga strelka).</li>' +
      '<li><b>«Bosh ekranga qo'+"'"+'shish»</b> ni tanlang.</li>' +
      '<li>Kurs alohida ilova kabi ochiladi va oflaynda ham ishlaydi.</li></ol>';
    var close = el("button", "toast__close", "✕");
    close.setAttribute("aria-label", "Yopish");
    close.addEventListener("click", function () { box.remove(); });
    box.appendChild(close);
    document.body.appendChild(box);
  }

  /* O'rnatish tugmasini yuqori panelga qo'yish */
  function placeInstallButton() {
    if (isStandalone()) return;                  // allaqachon ilova sifatida ochilgan
    if (!deferredPrompt && !isIos()) return;     // brauzer o'rnatishni taklif qilmayapti
    var nav = topbarNav();
    if (!nav) return;
    if (installBtn && nav.contains(installBtn)) return;

    installBtn = el("button", "btn btn--install");
    installBtn.type = "button";
    installBtn.title = "Kursni qurilmaga ilova sifatida o'rnatish (oflaynda ham ishlaydi)";
    installBtn.innerHTML = "<span aria-hidden=\"true\">⤓</span> <span class=\"btn__text\">Ilova sifatida o'rnatish</span>";

    installBtn.addEventListener("click", triggerInstall);
    nav.appendChild(installBtn);
  }

  /* O'rnatishni boshlash — ham yuqori paneldagi tugma, ham kartochka shuni chaqiradi */
  function triggerInstall() {
    if (!deferredPrompt) {          // iOS yoki taklif hali tayyor emas
      showIosHint();
      return;
    }
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    p.userChoice.then(function (choice) {
      if (choice && choice.outcome === "accepted") {
        hideInstallUI();
      } else {
        deferredPrompt = p;         // rad etilsa — keyinroq qayta bosishi mumkin
      }
    }).catch(function () {});
  }

  function hideInstallUI() {
    if (installBtn) installBtn.remove();
    var card = document.querySelector("[data-install-card]");
    if (card) card.hidden = true;
  }

  /* Bosh sahifadagi katta kartochka */
  function syncInstallCard() {
    var card = document.querySelector("[data-install-card]");
    if (!card) return;
    if (isStandalone() || (!deferredPrompt && !isIos())) { card.hidden = true; return; }
    card.hidden = false;
    var btn = card.querySelector("[data-install-card-btn]");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", triggerInstall);
    }
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();          // brauzerning o'z bannerini to'xtatib, o'z tugmamizni ko'rsatamiz
    deferredPrompt = e;
    placeInstallButton();
    syncInstallCard();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideInstallUI();
    toast("Ilova o'rnatildi — endi kursni oflaynda ham o'qishingiz mumkin.");
  });

  /* Service worker: oflayn kesh + yangilanish haqida xabar */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;   // file:// da SW ishlamaydi

    navigator.serviceWorker.register("sw.js", { scope: "./" }).then(function (reg) {
      reg.addEventListener("updatefound", function () {
        var sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", function () {
          // Yangi versiya tayyor, lekin eskisi hali ishlab turibdi
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            toast("Kursning yangi versiyasi tayyor.", "Yangilash", function () {
              sw.postMessage({ type: "SKIP_WAITING" });
            });
          }
        });
      });
    }).catch(function (err) {
      console.warn("[kurs] service worker:", err && err.message);
    });

    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  function watchConnection() {
    window.addEventListener("offline", function () {
      if (offlineNoticeShown) return;
      offlineNoticeShown = true;
      toast("Oflayn rejim — saqlangan darslar ochilaveradi.");
    });
  }

  /* ======================================================================
     Ishga tushirish
     ====================================================================== */

  function boot() {
    var darsId = document.documentElement.getAttribute("data-dars");
    var isIndex = document.body.getAttribute("data-page") === "index";

    applyPrefs();                       // mavzu/shrift — chizishdan oldin
    registerServiceWorker();
    watchConnection();
    placeInstallButton();
    syncInstallCard();
    if (isIndex) placePrefsButton();

    loadLessons().then(function (data) {
      if (isIndex) renderIndex(data);
      if (darsId) renderLesson(data, darsId);
      placeInstallButton();   // dars sahifasida topbar JS bilan chizilgani uchun
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
      if (darsId) { setupReader(darsId); placePrefsButton(); }
      placeInstallButton();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
