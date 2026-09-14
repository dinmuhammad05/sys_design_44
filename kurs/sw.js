/* ==========================================================================
   Service worker — kursni oflayn o'qish va ilova sifatida o'rnatish uchun.

   Darslar ro'yxati lessons.json'dan o'qiladi, shuning uchun yangi dars
   qo'shilganda bu faylni tahrirlash SHART EMAS — u o'zi keshlanadi.
   ========================================================================== */

const VERSION = "kurs-v3";
const CACHE = VERSION;

/* Ilova qobig'i — hamma sahifa uchun kerak bo'ladigan minimal to'plam */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/script.js",
  "./assets/lessons.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png"
];

/* ---------- O'rnatish: qobiq + barcha dars sahifalarini keshlash ---------- */

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Darslar ro'yxatini o'qib, har bir dars sahifasini ham oldindan keshlaymiz
    let lessonUrls = [];
    try {
      const res = await fetch("./assets/lessons.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        lessonUrls = (data.darslar || [])
          .map((d) => d.fayl)
          .filter(Boolean)
          .map((f) => "./" + f);
      }
    } catch (e) {
      /* tarmoq yo'q bo'lsa ham o'rnatish buzilmasin */
    }

    // Bitta fayl yuklanmasa butun o'rnatish barbod bo'lmasligi uchun — birma-bir
    await Promise.all(
      SHELL.concat(lessonUrls).map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => null)
      )
    );
  })());
});

/* ---------- Faollashtirish: eski keshlarni tozalash ---------- */

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* Sahifadan "yangi versiyaga o't" signali */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* ---------- So'rovlarni ushlash ---------- */

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // tashqi manbalarga tegmaymiz

  // 1) Sahifalar (navigatsiya) va lessons.json — avval tarmoq, keyin kesh.
  //    Shunda onlaynda kontent har doim yangi, oflaynda esa saqlangani ochiladi.
  const isNavigation = req.mode === "navigate";
  const isData = url.pathname.endsWith("lessons.json");

  if (isNavigation || isData) {
    event.respondWith((async () => {
      try {
        const preload = isNavigation && event.preloadResponse ? await event.preloadResponse : null;
        const net = preload || await fetch(req);
        if (net && net.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, net.clone());
        }
        return net;
      } catch (e) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigation) {
          const home = await caches.match("./index.html");
          if (home) return home;
        }
        return new Response("Oflayn: bu sahifa hali saqlanmagan.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  // 2) Qolgan statik fayllar (CSS/JS/rasm) — avval kesh, fonda yangilanadi
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const network = fetch(req)
      .then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(() => null);
    return cached || (await network) || new Response("", { status: 504 });
  })());
});
