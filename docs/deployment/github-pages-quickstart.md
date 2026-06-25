# GitHub Pages Quickstart

Repository:

https://github.com/atlasoptimization/data_science_deck

Live URL:

https://atlasoptimization.github.io/data_science_deck/

Required Vite base path:

```text
/data_science_deck/
```

## 1. Enable GitHub Pages

In GitHub:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

## 2. Test Locally

```bash
pnpm prepare:github-pages
```

This runs the public asset sync, verifies every manifest asset path points to a committed runtime file, builds with the GitHub Pages base path, audits private path leaks, and prints asset size diagnostics.

For public deployment, configure compressed roots locally in `.env.local`:

```bash
DECK_COMPRESSED_PDF_ROOT=/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/output_compressed
DECK_COMPRESSED_IMAGE_ROOT=/home/jemil/Desktop/Card_game_full/Scribus_setup/Scribus_files/images_compressed
```

`pnpm sync:assets:public` uses those compressed roots when available. The compressed image folder may contain `.webp` files even when CSV art fields still mention `.png`; the sync resolves PNG references to WebP files with the same basename.

Public sync also generates two PDF-preview sizes. Thumbnail previews are used by compact UI, while high-resolution reading previews are used by desk cards so zoomed card text stays readable. If `cwebp` is installed locally and `PUBLIC_PREVIEW_FORMAT=webp`, previews are written as WebP; otherwise the generator falls back to PNG.

If the public deck assets are already current and committed, you can test just the static build:

```bash
pnpm audit:manifest-assets
pnpm build:github-pages
pnpm audit:release-paths
```

The build output is `apps/web/dist/`. If `apps/web/public/deck` exists, Vite should copy it to `apps/web/dist/deck`.

## Why GitHub Actions Must Not Run sync:assets

`pnpm sync:assets` reads private local source folders configured in `.env.local`, such as local CSV, image, and PDF roots. GitHub Actions runs on GitHub's servers. It does not have `.env.local`, and it cannot access private machine paths such as `/home/jemil/Desktop/...`.

Therefore:

1. Run `pnpm sync:assets:public` locally.
2. Confirm the generated runtime assets are browser-safe.
3. Commit the resulting public runtime assets under `apps/web/public/deck`.
4. Let GitHub Actions build and deploy from those committed static assets.

The workflow intentionally runs `pnpm build:github-pages`, not `pnpm sync:assets`.

## 3. Commit And Push

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

## 4. Watch Deployment

Open:

`GitHub -> Actions -> Deploy GitHub Pages`

## 5. Open The App

https://atlasoptimization.github.io/data_science_deck/

## 6. Normal Update Routine

```bash
git checkout main
git pull origin main
pnpm sync:assets
pnpm sync:assets:public
pnpm audit:manifest-assets
pnpm audit:asset-sizes
pnpm build:github-pages
pnpm audit:public-build-assets
pnpm smoke:asset-urls
pnpm audit:release-paths
pnpm check:public-assets-tracked
git add package.json scripts docs packages apps
git add -f apps/web/public/deck
git commit -m "Update public deck assets"
git push origin main
```

GitHub Actions then builds and deploys automatically.

`apps/web/public/deck` is intentionally ignored by default so private/generated deck files are not added accidentally. For the public GitHub Pages runtime bundle, force-add only the reviewed browser-safe deck output with `git add -f apps/web/public/deck`.

## Troubleshooting

- Blank page: the Vite base path is likely wrong. For this repository it must be `/data_science_deck/`.
- Missing cards: check that `apps/web/public/deck` exists before build and `apps/web/dist/deck` exists after build.
- Missing images/previews: run `pnpm audit:manifest-assets`. It fails when `manifest.json` points to an image, preview, icon, handbook, or background file that is not present under `apps/web/public`.
- Missing deployed assets: run `pnpm audit:public-build-assets` after `pnpm build:github-pages`. It checks both `apps/web/public/deck` and `apps/web/dist/deck`.
- Broken representative card URLs: run `pnpm smoke:asset-urls` after `pnpm build:github-pages`. It checks The Aspect preview/PDF paths and a representative art image in `apps/web/dist`.
- Untracked public assets: run `pnpm check:public-assets-tracked`. If it warns, run `git add -f apps/web/public/deck`.
- Release audit failure: a private filesystem path leaked into public runtime output.

## Live Site Asset Debugging

1. Open `https://atlasoptimization.github.io/data_science_deck/deck/manifest.json`.
2. Copy one `frontImage` path, for example `deck/pdf-previews/reading/aspect/the-aspect_front_reading.png`.
3. Test `https://atlasoptimization.github.io/data_science_deck/deck/pdf-previews/reading/aspect/the-aspect_front_reading.png`.
4. If that URL returns 404, the asset was not committed/deployed or the manifest path is wrong.
5. If that URL returns 200, the browser can access it and the bug is in app rendering or URL resolution.
6. Test the PDF directly at `https://atlasoptimization.github.io/data_science_deck/deck/pdfs/aspect/the-aspect.pdf`.

If the PDF URL returns HTML or the app shell instead of a PDF, the file is missing from the deployed artifact or the manifest path does not point at the deployed file.

Everything in `apps/web/dist` is public and downloadable. The audit prevents private filesystem paths, but it does not decide which card/PDF content is allowed to be public.
