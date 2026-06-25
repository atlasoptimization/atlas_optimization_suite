# Asset Size Optimization

GitHub Pages serves the committed runtime bundle under `apps/web/public/deck`. Everything in that folder is public and downloadable, so public deployments should use compressed runtime assets.

Recommended local source folders:

```text
/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/output_compressed
/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/images_compressed
```

Configure them locally in `.env.local`:

```bash
DECK_COMPRESSED_PDF_ROOT=/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/output_compressed
DECK_COMPRESSED_IMAGE_ROOT=/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/images_compressed
PUBLIC_PREVIEW_THUMB_HEIGHT=700
PUBLIC_PREVIEW_READING_HEIGHT=1600
PUBLIC_PREVIEW_FORMAT=webp
PUBLIC_PREVIEW_WEBP_QUALITY=85
```

Then prepare public assets:

```bash
pnpm sync:assets:public
pnpm audit:asset-sizes
pnpm build:github-pages
pnpm audit:release-paths
```

The public sync prefers compressed PDFs and WebP card images when those roots exist. If a CSV art field says `Gambler.png`, the sync can resolve `Gambler.webp` from the compressed image tree and write the copied WebP path into `manifest.json`.

PDF compression should preserve text inside the PDF, but the desk does not render live PDF text. Desk cards use raster previews generated from the PDFs, so preview resolution determines readability while zooming.

The sync now writes two preview sizes:

- `deck/pdf-previews/thumb/...`: small previews for piles, hover previews, and compact candidate cards.
- `deck/pdf-previews/reading/...`: high-resolution previews for cards on the desk and reading zoom.

The manifest exposes `frontThumbImage` / `backThumbImage` and `frontReadingImage` / `backReadingImage`. `frontImage` / `backImage` remain as compatibility fields and point to the reading preview when available.

`PUBLIC_PREVIEW_FORMAT=webp` is preferred. Install `cwebp` locally if you want WebP preview output; without it, the sync falls back to PNG previews while keeping the same manifest fields.

GitHub Actions does not run asset sync. It only builds from committed `apps/web/public/deck` assets.
