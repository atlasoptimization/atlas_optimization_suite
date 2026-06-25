# Data Science Deck

A compact tool for structured thinking about models, assumptions, uncertainty, omissions, and decisions.

## Open The App

[Launch the Data Science Deck](https://atlasoptimization.github.io/data_science_deck/)

The app runs directly in the browser via GitHub Pages. No installation is needed for the web version.

Secondary links:

- [GitHub repository](https://github.com/atlasoptimization/data_science_deck)
- [Local development quickstart](#quickstart-for-users)
- [GitHub Pages deployment notes](docs/deployment/github-pages-quickstart.md)

## What It Is

The Data Science Deck is a compact tool for structured thinking.

This repository contains a browser-based modelling workspace for the Data Science Deck: a digital field desk where cards, notes, arrows, piles, and game modes help you examine models, assumptions, uncertainty, omissions, and decisions.

It is not a fortune-telling app. It is not a casual card game. It is a thinking instrument for scientific modelling: part desk, part prompt system, part model criticism ritual.

The app gives you a zoomable, pannable tableau for working through modelling questions. You draw cards from conceptual domains, place them spatially, rotate their interpretation, connect them with notes and arrows, and end with a more explicit modelling judgement.

Use it when you want to ask better questions about:

- what your data actually represents
- which assumptions your model imposes
- how your model adapts, overfits, or transforms
- what is missing or outside the frame
- which decision pressure is shaping interpretation
- which abstract lens should modify the analysis

## Who It Is For

- Machine learning practitioners.
- Data scientists and analysts.
- Researchers working with models, measurements, or uncertainty.
- Teachers and students learning model criticism.
- Modelling teams that need a shared surface for assumptions, omissions, and decisions.

## How It Works

Choose a modelling question, draw cards from the deck's conceptual domains, place them on the desk, and annotate the emerging structure with notes and arrows. Guided modes can suggest the next action, while manual play lets you inspect, discard, reveal, export, and discuss the resulting tableau.

## Spirit Of The Game

Draw cards to externalize a modelling problem. Place them so the desk becomes a map of the question. Use randomness to redirect attention, not to predict the future.

The cards do not know the answer. They force better questions.

A good session should leave you with sharper hypotheses, clearer failure modes, and a next modelling action. The deck works best when scientific interpretation and reflective structure are both present: empirical discipline on one side, deliberate reframing on the other.

## Core Features

- Zoomable and pannable finite desk/tableau.
- Fixed domain piles and discard piles.
- Card browser with domain grouping.
- Card search.
- Guided game modes.
- Next action panel for mode-driven play.
- Notes and arrows for annotation.
- Minimap and view navigation controls.
- Fit board, fit cards, and standard view bookmarks.
- Temporary reading zoom for cards.
- Local session save/load in unrestricted local builds.
- JSON import/export for portable sessions.
- Markdown session report export.
- PNG desk export when enabled.
- AI context export / Ask AI prompt tools when enabled.
- Custom cards and folder-based custom domains in local/full builds.
- Bundled help guide and optional handbook.

## The Six Domains

### Source

What is observed, measured, given, or encountered. The phenomenon, data, materials, traces, and viewpoints.

### Structure

What is imposed. Assumptions, constraints, probability structure, hierarchy, model architecture, symmetries.

### Chameleon

What adapts or behaves. Model class, parameters, latent variables, learning dynamics, generalization, overfit, transformation.

### Void

What is absent or excluded. Missing data, blind spots, boundary conditions, ignored alternatives, model failure, negative space.

### Volition

What is wanted. Objectives, values, decisions, incentives, pressure, responsibility, interpretation bias.

### Aspect

How something is viewed. Abstract thinking operators that modify a target: perspective, configuration, passage, difficulty, agency.

## How To Play

1. Choose or write a modelling question.
2. Choose a mode.
3. Click Next or draw from domain piles.
4. Place cards on the desk.
5. Use orientation:
   - `upright`: constructive reading / virtue
   - `reversed`: pathology / failure mode
   - `modifier`: card modifies another object or reading
   - `question`: unresolved question
6. Add notes and arrows.
7. Reframe, inspect, discard, reveal, zoom, or export.
8. End with a synthesis and a next modelling action.

Aspect cards are usually modifiers. Hidden cards are useful for blind placement modes such as True Tarot. Game modes guide the process, but manual actions remain available.

## Example Mini-Game

### Debugging a sensor calibration model

Question:

> Why does my calibration model work on training data but fail on a new measurement campaign?

One possible sequence:

1. Draw a Source card to anchor the measurement campaign and data-generating situation.
2. Draw a Structure card to expose an assumption such as linearity, independence, hierarchy, or a hard constraint.
3. Draw a Chameleon card to examine model behaviour: overfitting, adaptation, latent variables, optimizer dynamics, or model class.
4. Draw a Void card to ask what is missing: weather, device drift, an unmodelled regime, a missing covariate, or a boundary condition.
5. Draw a Volition card to clarify decision pressure: accuracy, interpretability, deadline, operational risk, responsibility.
6. Draw an Aspect card to modify the reading: fragility, context, transformation, conflict, passage, or agency.

End with one synthesis note:

> The failure may not be a parameter problem but a source-shift/void problem: the new campaign lives outside the assumptions of the original calibration model.

That note becomes a modelling action: inspect campaign shift, device drift, and missing covariates before tuning parameters.

## Quickstart For Users

The browser app is usable on mobile in a simplified guided mode. Mobile hides advanced panels such as the minimap, developer tools, custom assets, and persistent pile overlays; use desktop for full editing and custom-domain workflows.

For local development with the full feature set:

```bash
pnpm install
pnpm sync:assets:local
pnpm dev
```

Then open the local Vite URL printed by the dev server.

The older command still defaults to the local-full profile:

```bash
pnpm sync:assets
```

## Quickstart For Developers

Run tests:

```bash
pnpm test
```

Build the web app:

```bash
pnpm --filter @dsd/web build
```

Audit public/runtime output for private paths:

```bash
pnpm audit:release-paths
```

## Deployment Profiles

Profile files live in `config/profiles/`:

- `local-full`: unrestricted local development.
- `public-demo`: static public demo with custom/local-only features hidden or disabled.
- `local-release`: downloadable static release build.

Useful commands:

```bash
pnpm sync:assets:local
pnpm sync:assets:public
pnpm sync:assets:release
pnpm prepare:github-pages
pnpm build:public:github
pnpm build:public:atlas
pnpm build:local-release
pnpm audit:release-paths
pnpm audit:manifest-assets
pnpm audit:asset-sizes
```

Runtime builds must be self-contained. Public manifests and built files must not contain private paths such as `/home/`, `/Desktop/`, `file://`, `Card_game_full`, or `Scribus_setup`.

For GitHub Pages, configure compressed local roots such as `DECK_COMPRESSED_PDF_ROOT` and `DECK_COMPRESSED_IMAGE_ROOT`, run `pnpm sync:assets:public`, commit `apps/web/public/deck`, and let GitHub Actions build from those committed runtime assets.

## Asset Pipeline

The app consumes deck material from local source assets during sync:

1. CSV semantic card data.
2. Scribus-generated card PDFs.
3. PDF page previews for front/back card display.
4. A generated web manifest consumed by the React app.
5. An optional bundled handbook PDF.
6. Optional topology background images for thematic, zonal, or uniform map overlays.

Private deck assets are not committed to this repository. Configure `.env.local` locally, run an asset sync, and keep generated private deck output uncommitted unless explicitly intended.

Public demo builds use `pnpm sync:assets:public`. Until a smaller public sample deck is curated, that profile is configured to include the approved runtime deck bundle while excluding custom domains. GitHub Pages builds need committed public demo assets or another public asset source available in CI.

## Custom Cards And Domains

Local/full builds can enable custom cards and folder-based custom-domain content packs.

To create a custom domain:

1. Copy `custom_domains/example_custom_domain/`.
2. Rename the copied folder.
3. Edit `templates/domain_metadata.txt`.
4. Edit `templates/card_data_*.csv`.
5. Put background images in `background/`.
6. Put card art in `card_graphics/`.
7. Run the external generator to create PDFs in `output/`.
8. Run `pnpm sync:assets:local`.
9. Enable the domain in the Custom Domain Manager.

If PDFs are missing, custom-domain cards remain usable through text-card fallback. Generated output under custom-domain `output/` and web deck output should not be committed unless explicitly intended.

## Deployment Docs

- GitHub Pages: `docs/deployment/github-pages.md`
- Atlas / WordPress subdirectory: `docs/deployment/atlas-wordpress.md`
- Local install: `docs/deployment/local-install.md`
- Local release: `docs/deployment/local-release.md`

## Troubleshooting

Missing PDFs or previews:

```bash
pnpm sync:assets:local
```

Blurry previews:

- Increase `PDF_PREVIEW_DPI`.
- Rerun asset sync.

Missing PDF renderer:

- Install Poppler tools, usually provided by `poppler-utils`.
- Rerun asset sync.

Build fails after asset changes:

```bash
pnpm sync:assets:local
pnpm test
pnpm --filter @dsd/web build
```

## Privacy

Do not commit private deck source files, generated private previews, `.env.local`, or machine-specific asset paths. Runtime builds should not expose private filesystem paths in manifests, bundled JavaScript, CSS, HTML, exports, or public deck metadata.

## License

The app code and deck materials may have different licensing terms. Deck artwork, card text, and associated materials remain owned by their respective author/rightsholder as described in the project documentation and in-app guide.

Current project/card license details should be verified before redistribution.
