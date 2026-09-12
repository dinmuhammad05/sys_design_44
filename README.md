# Tizim dizayni — chuqur kurs

Sof HTML/CSS/JS asosidagi statik kurs sayti. Build jarayoni yo'q, tashqi kutubxona yo'q —
GitHub Pages'ga to'g'ridan-to'g'ri joylashtiriladi.

## Tuzilma

```
kurs/
├── index.html              # lessons.json'ni o'qib, kartochka va progressni dinamik chizadi
├── 1.1-tizim-yuragi.html
├── 1.2-resurslar-chegarasi.html
├── 1.3-tizimdagi-real-rollar.html
└── assets/
    ├── style.css           # barcha sahifalar uchun umumiy CSS
    ├── script.js           # navigatsiya, progress-tracking, active-state
    └── lessons.json        # darslarning markazlashgan ro'yxati
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

## Progress

O'qilgan darslar brauzerning `localStorage` ida (`kurs.progress.v1` kaliti) saqlanadi —
server ham, hisob ham talab qilinmaydi.
