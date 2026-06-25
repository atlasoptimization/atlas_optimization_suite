# Atlas / WordPress Subdirectory Deployment

Build the public demo for the Atlas subdirectory:

```bash
pnpm build:public:atlas
pnpm audit:release-paths
```

The build output is:

```text
apps/web/dist/
```

Upload the contents of `apps/web/dist/` to:

```text
public_html/data-science-deck/
```

The expected URL is:

```text
https://atlasoptimization.com/data-science-deck/
```

The Vite base path for this deployment must be `/data-science-deck/`. The `build:public:atlas` script sets that base path.

WordPress should normally not be integrated directly with the app. Use a static subfolder such as `public_html/data-science-deck/` and link to it from WordPress navigation or content.

If route refresh fails later after client-side routing is added, use hash routing or configure a static fallback to `index.html`.
