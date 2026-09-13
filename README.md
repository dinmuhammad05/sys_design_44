# Tizim dizayni — chuqur kurs

Sof HTML/CSS/JS asosidagi statik kurs sayti. Build jarayoni yo'q, tashqi kutubxona yo'q —
GitHub Pages'ga to'g'ridan-to'g'ri joylashtiriladi.

## Tuzilma

```
kurs/
├── index.html              # lessons.json'ni o'qib, kartochka va progressni dinamik chizadi
├── 1.1-tizim-yuragi.html            # 1. Kompyuter anatomiyasi
├── 1.2-resurslar-chegarasi.html
├── 1.3-tizimdagi-real-rollar.html
├── 2.1-os-asosiy-tushunchalar.html  # 2. Operatsion tizim va abstraktsiya
├── 2.2-protsess-va-thread.html
├── 2.3-virtual-xotira-va-izolyatsiya.html
├── 2.4-tizim-chaqiruvi.html
├── manifest.webmanifest    # PWA: ilova nomi, ikonkalari, rangi
├── sw.js                   # service worker: oflayn kesh
└── assets/
    ├── style.css           # barcha sahifalar uchun umumiy CSS
    ├── script.js           # navigatsiya, progress, o'rnatish tugmasi, SW ro'yxatdan o'tkazish
    ├── lessons.json        # darslarning markazlashgan ro'yxati
    └── icon-*.png          # ilova ikonkalari (192, 512, maskable, apple-touch)
```

Ildizdagi `index.html` — `kurs/` ga yo'naltiruvchi sahifa. `.nojekyll` fayli GitHub Pages'ning
Jekyll ishlov berishini o'chiradi.

## Yangi dars qo'shish

1. `kurs/assets/lessons.json` ga bitta yozuv qo'shing:

```json
{
  "asosiyId": 2,
  "asosiyNomi": "Tarmoq va protokollar",
  "asosiyTavsif": "Mashinalar bir-biri bilan qanday gaplashadi.",
  "ichkiId": "2.1",
  "ichkiNomi": "TCP nima uchun shunday ishlaydi",
  "ichkiTavsif": "Qo'l siqish, oyna, qayta uzatish.",
  "fayl": "2.1-tcp-asoslari.html",
  "tartib": 1,
  "davomiyligi": "25 daqiqa"
}
```

2. `kurs/2.1-tcp-asoslari.html` faylini yarating. Eng oson yo'li — mavjud darsdan nusxa olish:

```bash
cp kurs/1.1-tizim-yuragi.html kurs/2.1-tcp-asoslari.html
```

va uch joyni o'zgartirish:

- `<html lang="uz" data-dars="2.1">` — dars identifikatori (lessons.json'dagi `ichkiId` bilan bir xil);
- `<title>` va `<h1>`;
- `<article class="lesson">` ichidagi matn.

`index.html`, `style.css`, `script.js` fayllariga tegish shart emas: yangi asosiy mavzu
avtomatik ravishda alohida guruh bo'lib chiqadi, oldingi/keyingi tugmalari va progress
o'z-o'zidan yangilanadi.

### Sahifada ishlatiladigan bloklar

| Blok | Sinf |
|---|---|
| Kirish paragrafi | `<p class="lead">` |
| Mundarija (avtomatik) | `<nav class="toc" data-toc></nav>` |
| Bo'lim sarlavhasi (avtomatik raqamlanadi) | `<h2 id="...">` |
| Eslatma | `.note`, `.note--warn`, `.note--danger`, `.note--ok` |
| Xatolar ro'yxati | `<ul class="mistakes">` |
| Sxema | `<figure class="figure">` + inline SVG |
| Xulosa | `<div class="summary">` |
| Progress tugmasi (avtomatik) | `<div class="done-bar" data-done-bar></div>` |
| Oldingi/keyingi (avtomatik) | `<nav class="lesson-nav" data-lesson-nav></nav>` |

## Lokal ishga tushirish

`lessons.json` `fetch()` orqali o'qiladi, shuning uchun faylni to'g'ridan-to'g'ri `file://`
orqali ochish ishlamaydi. Oddiy server yetarli:

```bash
python3 -m http.server 8000
# http://localhost:8000/kurs/
```

## GitHub Pages

Settings → Pages → Source: `Deploy from a branch`, branch: asosiy branch, papka: `/ (root)`.
Sayt `https://<user>.github.io/<repo>/` manzilida ochiladi.

## Ilova sifatida o'rnatish (PWA)

Sayt Progressive Web App sifatida ishlaydi: uni telefon yoki kompyuterga o'rnatish mumkin,
brauzer paneli ko'rinmaydi va **internetsiz ham** ochiladi.

- **Android / Chrome / Edge / Windows / macOS** — bosh sahifadagi «Ilova sifatida o'rnating»
  kartochkasi yoki yuqori paneldagi ⤓ tugmasi (brauzer `beforeinstallprompt` hodisasini
  bergan paytda ko'rinadi).
- **iPhone / iPad (Safari)** — Ulashish → «Bosh ekranga qo'shish». Sahifada shu haqda
  ko'rsatma chiqadi (iOS `beforeinstallprompt` ni qo'llab-quvvatlamaydi).

`sw.js` o'rnatilayotganda `lessons.json` ni o'qib, **barcha dars sahifalarini** oldindan keshlaydi —
yangi dars qo'shilganda bu faylni tahrirlash shart emas.

Kesh strategiyasi:

| Nima | Strategiya | Sababi |
|---|---|---|
| HTML sahifalar, `lessons.json` | avval tarmoq, keyin kesh | onlaynda kontent har doim yangi, oflaynda saqlangani ochiladi |
| CSS, JS, ikonkalar | avval kesh, fonda yangilanadi | tez yuklanish |

Kontentni jiddiy o'zgartirgandan so'ng `sw.js` ichidagi `VERSION` qiymatini oshiring
(`kurs-v1` → `kurs-v2`) — eski kesh tozalanadi. Yangi versiya tayyor bo'lganda foydalanuvchiga
«Yangilash» tugmasi bilan xabar chiqadi.

> Eslatma: service worker faqat HTTPS yoki `localhost` da ishlaydi — `file://` orqali ochilganda
> sayt oddiy statik sahifa sifatida ishlaydi.

## Progress

O'qilgan darslar brauzerning `localStorage` ida (`kurs.progress.v1` kaliti) saqlanadi —
server ham, hisob ham talab qilinmaydi.
