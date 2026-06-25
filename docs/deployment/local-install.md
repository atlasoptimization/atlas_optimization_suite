# Local Full Development Install

Local full development supports the unrestricted feature set, including custom cards, custom domains, local save/load, developer tools, and full asset sync.

```bash
git clone <repo-url>
cd data_science_deck_app
pnpm install
```

Create `.env.local` with local asset roots. Do not commit `.env.local`.

Then run:

```bash
pnpm sync:assets:local
pnpm dev
```

The app will print a local Vite URL. Use this mode when working with private deck source folders, Scribus outputs, custom domains, and local-only workflows.

Portable session exchange should use JSON import/export. Browser local save/load is intended for the current machine/browser profile.
