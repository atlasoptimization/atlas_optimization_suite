# Atlas Optimization Backend

The backend execution core lives in `atlas_opt_core` and stays independent from
FastAPI routes. The older `atlas_opt` package still contains the semantic model,
registry, inspector, compiler, and solver implementation; `atlas_opt_core`
provides the stable pure-Python entry points used by FastAPI, local scripts, and
future Pyodide/Colab adapters.
The active architecture direction is CVXPY-first: high-level semantic objects are compatibility
and future macro layers over a generic CVXPY graph.

Intended flow:

1. The GUI exports Atlas IR JSON.
2. `atlas_opt.schema` validates that JSON into typed Pydantic IR models.
3. `AtlasDesk.from_ir(...)` currently compiles validated IR into compatibility registries for cards, queries, objectives, constraints, diagnostics, and metadata.
4. The next core layer should add CVXPY registry/introspection so installed CVXPY atoms are exposed as generic `AtomSpec` metadata.
5. The evaluator, compiler, reports, KPIs, optimizer orchestration, and CVXPY backend operate on the compiled model.

FastAPI endpoints are thin transport adapters in `api/main.py`: receive JSON,
validate IR, call `atlas_opt_core`, and return structured results.

The first implemented CVXPY slice is intentionally small: scalar variables, constants, linear
TaggedSum compatibility expressions, linear objectives, and simple linear constraints. The next
implementation path is automatic CVXPY atom discovery and generic atom compilation rather than
manual frontend hard-coding of atoms.

## Local Development

Create and activate a Python environment, then install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
```

Run tests and start the local API:

```bash
python3 -m pytest
uvicorn api.main:app --reload
```

Useful endpoints:

- `GET /health`
- `GET /cvxpy/info`
- `GET /cvxpy/atoms`
- `GET /cvxpy/symbols`
- `POST /validate`
- `POST /generate_code`
- `POST /solve`

`GET /cvxpy/info` reports the locally installed CVXPY version, installed
solvers, Python version, and core import status. This proves the backend is
using the client machine's local Python/CVXPY environment rather than an Atlas
hosted service.

The local frontend expects the backend at `http://localhost:8000` by default. Override with
`VITE_ATLAS_BACKEND_URL` when starting the web app.

## FastAPI-independent core

`atlas_opt_core` must not import FastAPI. Its public functions accept Atlas IR as
Pydantic models or JSON-like dictionaries and return JSON-serializable results:

- `validate_ir(ir)`
- `inspect_ir(ir)`
- `discover_atoms()`
- `generate_code(ir)`
- `solve_ir(ir)`

This keeps the product compatible with multiple execution modes: local FastAPI,
future Browser/Pyodide execution, Colab export, and hosted APIs.

## CVXPY Symbol Synchronization

Atlas synchronizes CVXPY symbols at development/build time so the GUI does not
need to introspect CVXPY on every startup and the backend has a safe compilation
allowlist.

From the repository root:

```bash
PYTHONPATH=backend python3 -m atlas_opt_core.tools.sync_cvxpy_symbols
PYTHONPATH=backend python3 -m atlas_opt_core.tools.sync_cvxpy_symbols --check
```

The root `package.json` also exposes:

```bash
pnpm sync:cvxpy
```

Generated catalogs:

- `backend/atlas_opt_core/generated/cvxpy_symbols.generated.json`
- `apps/web/src/generated/cvxpy_symbols.generated.json`

The sync tool uses local Python introspection of the installed `cvxpy` package.
It does not query online documentation. Manual JSON rules under
`backend/atlas_opt_core/config/` enrich important symbols for GUI use and add
Atlas pseudo-symbols such as `atlas.operator.add`, `atlas.operator.matmul`, and
constraint operators.

Rerun the sync command after upgrading CVXPY, changing symbol override files, or
changing pseudo-symbol rules. Use `--check` in CI or before committing generated
catalog updates; it exits nonzero if the backend and frontend generated assets
are out of sync.

The frontend loads `apps/web/src/generated/cvxpy_symbols.generated.json`
directly so static deployments can display the atom/function palette without a
running backend. The backend serves the same generated catalog at
`GET /cvxpy/symbols` and uses it as the dynamic-compilation allowlist.
