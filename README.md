# 漢字 Hànzì — Learn Chinese Characters

A clean, interactive Chinese character learning app with two libraries:
- **Basic** — HSK 1–4 characters (~1200 common characters)
- **Business** — Meeting vocabulary and contract document terms

## Features

- **Learn** — Character card with pinyin, tone guide, example sentence, radical breakdown, and memory story
- **Write** — Handwriting practice canvas with stroke tip guide
- **Flashcard** — Flip cards to test yourself
- **Quiz** — Multiple-choice meaning quiz with streak counter
- **Search** — Search by character, pinyin, or English meaning
- **Review Later** — Bookmark characters to a personal review list (saved in browser)
- **Sound** — Hear pronunciation using your device's Mandarin voice

## Live Demo

Deploy to GitHub Pages — see below.

## Deploy to GitHub Pages

1. Fork or clone this repo
2. Go to **Settings → Pages**
3. Set source to **Deploy from branch → main → /src**
4. Your app will be live at `https://yourusername.github.io/hanzi-app`

## Run Locally

```bash
cd src
python3 -m http.server 8080
# open http://localhost:8080
```

> **Note:** The app loads JSON data files via `fetch()`, so it must be served over HTTP — opening `index.html` directly in the browser as a `file://` URL will not work.

## Data Sources

- `data/basic.json` — HSK 1–4 character list with pinyin, meanings, examples, and stroke tips
- `data/business.json` — Business Chinese: meeting vocabulary and contract document terms

Both files are static JSON — no API key or backend required.

## Structure

```
hanzi-app/
  data/
    basic.json        ← HSK 1–4 characters
    business.json     ← Business vocabulary
  src/
    index.html        ← Basic character library
    business.html     ← Business vocabulary library
    app.js            ← Shared app logic
    style.css         ← Shared styles
  README.md
```

## License

Data derived from open HSK word lists and original content.  
App code: MIT License.
