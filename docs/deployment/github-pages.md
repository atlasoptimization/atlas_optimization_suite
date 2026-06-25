# This is what i did:
# open terminal, go to folder, right branch
cd ~/Desktop/Card_game_full/data_science_deck_app
git checkout main
git checkout -b deploy/github-pages


# Update routine after github pages works:
cd ~/Desktop/Card_game_full/data_science_deck_app

git checkout main
git pull origin main

pnpm sync:assets
pnpm sync:assets:public
pnpm audit:manifest-assets
pnpm audit:asset-sizes
pnpm build:github-pages
pnpm audit:release-paths

git status
git add .
git commit -m "Update app"
git push origin main

# Got https://github.com/atlasoptimization/data_science_deck, Deploy GitHub Pages
# Watch deployment https://atlasoptimization.github.io/data_science_deck/


# GitHub Pages Deployment

GitHub Pages hosts static sites. The app is a Vite static build, so the public build must use the correct base path for the repository or custom domain.

Build locally:

```bash
pnpm build:public:github
pnpm audit:release-paths
```

The workflow deploys:

```text
apps/web/dist/
```

Enable GitHub Pages in repository settings and choose GitHub Actions as the source. The workflow is `.github/workflows/deploy-pages.yml` and can run on `main` pushes or through `workflow_dispatch`.

For a project site, set the repository variable `PUBLIC_BASE_PATH` to:

```text
/REPOSITORY_NAME/
```

If the variable is not set, the workflow defaults to `/data-science-deck-app/`. Do not assume this is correct for every fork or renamed repo.

Only public assets may be deployed. The public workflow needs either committed public demo assets under `apps/web/public/deck/` or another public asset source that `pnpm sync:assets:public` can read. Private `.env.local` paths are not available in GitHub Actions.

To use a custom domain later, configure the GitHub Pages custom domain and update `PUBLIC_BASE_PATH` to `/` if the app is served at the domain root.
