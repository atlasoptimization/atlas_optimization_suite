# Custom Domain Starter

Copy this folder, rename the domain, and edit the spec/cards for your own local modelling vocabulary.

Current MVP import:

1. Edit `domain.spec.example.json`.
2. Keep the `cards` array embedded in the JSON.
3. In the app, use `File > Custom domains > Import custom domain spec`.

Planned file-based import:

1. Edit `cards.example.csv`.
2. Add optional images under `images/`.
3. Point `cardsCsv`, `imagesFolder`, and `symbolPath` at those relative files.

The app does not modify canonical deck CSV files and does not require Scribus/PDF generation for custom domains. Imported cards render as text cards by default.
