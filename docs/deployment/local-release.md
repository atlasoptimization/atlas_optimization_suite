# Downloadable Local Release

The local release is a static build intended for users who download a zip from GitHub Releases.

Build it:

```bash
pnpm build:local-release
pnpm audit:release-paths
```

The output is:

```text
apps/web/dist/
```

Package `apps/web/dist/` as the release artifact. After downloading and unzipping, serve the folder with a local static server:

```bash
cd dist
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

The local release can enable more features than the public demo, but it is still a static browser app. JSON import/export remains the portable way to move sessions between builds.
