# Vice Cover Studio — GTA 6 Cover Art Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tiars837/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tiars837/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns a photo and a caption into cover art in the
style of GTA 6's posters: multi-panel layouts, bold outlined lettering and a
Vice City sunset or neon colour grade. Export as a PNG in 1080×1080,
1080×1350 or 1920×1080 to share.

## Try it

Serve `app/` with any static server and open `app/index.html` in desktop
Chrome — no network needed, photos never leave your machine:

```sh
python3 -m http.server 8080 --directory app
```

## How it works

1. **Photos** — upload up to three of your own photos (or use the two
   bundled synthetic samples), or drop image files onto the preview.
2. **Layout & grade** — pick Vice Trio (3 diagonal panels), Split Duo or
   Solo Shot, and a Sunset, Neon Night, Noir or Clean grade.
3. **Caption** — edit the bold title and gold subtitle.
4. **Crop** — click a panel in the preview, then choose its photo, zoom
   and pan.
5. **Export** — download the cover as a PNG at the chosen post size, or
   press **Present cover** to see it fullscreen.

## Files

- `main.ts` — entrypoint: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with the kit's `buildDossier`.
- `app/` — the static app: `index.html`, `style.css`, `cover.js`
  (the canvas renderer), `main.js` (the editor), fonts and sample images.
- `app/fonts/` — Noto Sans Black and Bold (SIL Open Font License).
- `app/assets/` — two synthetic sample photos drawn with Pillow; no real
  people, no Rockstar artwork.
- `screenshots/` — the exported cover and the editor at work.

Everything in the app is original work: no Rockstar Games logo, artwork or
font is used anywhere.

## Entry

Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun. License: MIT.
