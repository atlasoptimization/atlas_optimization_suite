# GitHub Pages + Browser/Pyodide Demo

Atlas can be published as a static frontend on GitHub Pages. The long-term goal is to run small examples directly in the user's browser through the `Browser/Pyodide` execution adapter.

## Current Status

- Static frontend builds are supported.
- `Mock` execution works without Python.
- `Browser/Pyodide` is represented as an execution adapter scaffold with runtime states:
  - Not loaded
  - Loading runtime
  - Ready
  - Error
- Full CVXPY solving in Pyodide is pending. Browser mode returns clear diagnostics instead of fake solve results.

## Local Static Build

From the repository root:

```bash
pnpm build:github-pages
```

For a repository-specific base path, use:

```bash
PUBLIC_BASE_PATH=/your-repository-name/ pnpm --filter @dsd/web build
```

The static output is:

```text
apps/web/dist/
```

## Deployment Concept

1. GitHub Pages serves `apps/web/dist`.
2. The Atlas GUI edits the same Atlas IR as every other deployment mode.
3. The user selects an execution backend:
   - `Mock` for static UI demos today.
   - `Browser/Pyodide` once CVXPY package loading and solve support are implemented.
   - `Local FastAPI` only when the user also runs a local backend.

## Limitations

- Browser/Pyodide does not currently load CVXPY or solve models.
- Tiny LP, Least Squares, and Ridge can be loaded as ordinary Atlas IR examples, but browser solve support is pending.
- Pyodide code must stay isolated under `apps/web/src/atlas/execution`; ordinary GUI components should not import Pyodide or deployment runtime code.
- The Python execution semantics should come from the FastAPI-independent `atlas_opt_core` package where practical. Any Pyodide loader should pass Atlas IR JSON into that core boundary and return the same JSON result shapes used by Local FastAPI.
- Static builds must remain useful without a backend. Use `Mock` mode for public UI demos until Browser/Pyodide solve support is real.

## Existing GitHub Pages Notes

The older Data Science Deck deployment docs remain under:

```text
docs/deployment/github-pages.md
docs/deployment/github-pages-quickstart.md
```

Use those for asset and GitHub Actions details until the Atlas-specific public demo workflow is split out.
