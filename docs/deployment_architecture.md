# Atlas Deployment Architecture

Atlas is a CVXPY-first modeling product. GUI features, Atlas IR, examples, tutorials, views, and diagnostics should not depend on where CVXPY runs.

## Product Core

Frontend product code lives under `apps/web/src/atlas`:

- `core/`: Atlas IR, model state, examples, tutorials, symbolic/evaluation helpers, result parsing.
- `ui/`: workbench, constructor, explorer, inspector, menus, tabs, solution and diagnostics views.
- `execution/`: runtime adapter interface plus deployment-specific execution adapters.

Backend product code lives under `backend/atlas_opt` and the stable execution facade lives under `backend/atlas_opt_core`:

- `schema.py`: Pydantic Atlas IR schema.
- `cvxpy_backend.py`, `cvxpy_inspector.py`, `cvxpy_registry.py`: CVXPY compilation, metadata, registry, code generation, and solve support.
- `diagnostics.py` and related modules: structured diagnostics/results used by API responses.
- `atlas_opt_core`: FastAPI-independent entry points for validation, inspection, atom discovery, code generation, and solve.

The frontend views should consume model state, result state, and diagnostics state. They should not import a concrete runtime such as `LocalFastApiBackend` or call `fetch` directly.

## Execution Backend Interface

Frontend runtime calls go through `apps/web/src/atlas/execution/ExecutionBackend.ts`.

Supported adapter ids:

- `mock`: deterministic browser-only development backend.
- `local-fastapi`: local Python/FastAPI backend, currently using `/health`, `/validate`, `/evaluate`, `/generate_code`, and `/solve`.
- `browser-pyodide`: placeholder for future in-browser Python/CVXPY execution.
- `colab-export`: placeholder for future Colab notebook/export execution.
- `hosted-api`: placeholder for a future hosted Atlas API.

Toolbar/menu actions for Validate, Evaluate, Generate Code, and Solve call the selected `ExecutionBackend`. Switching backend does not mutate the model.

## Deployment Wrappers

Deployment-specific wrappers belong under `deployments/`:

- `github_pages/`: static frontend hosting configuration. Intended to use browser execution later.
- `local_docker/`: local frontend plus FastAPI/CVXPY service packaging.
- `colab/`: notebook/script generation for Colab workflows.

Deployment wrappers should configure runtime availability and endpoints. They should not contain product modeling logic.

## Modes

Local development:

1. Run the frontend dev server.
2. Optionally run the local FastAPI backend.
3. Select `Local FastAPI` or `Mock` in the Atlas execution selector.

Static demo:

1. Build the frontend as static assets.
2. Use `Mock` today.
3. Use `Browser/Pyodide` when that adapter is implemented.

Colab export:

1. Frontend generates Atlas IR plus Python notebook/script content.
2. Colab executes CVXPY remotely.
3. Results can later be imported back into Atlas result state.

Hosted mode:

1. Frontend selects a hosted API adapter.
2. Atlas IR is sent to the hosted service.
3. Service returns validation metadata, generated code, solve results, and diagnostics.

## Current Boundary

`backendClient.ts` remains the low-level HTTP client for the local API and CVXPY atom registry. Runtime actions use `LocalFastApiBackend`; GUI views do not import local deployment code.

The Python core boundary is `atlas_opt_core`. It accepts Atlas IR as Pydantic models or JSON-like dictionaries and returns JSON-serializable dictionaries. It does not import FastAPI and should avoid server-only assumptions such as request objects, process-global web state, or filesystem paths that are only valid in the local API service.

## Future Pyodide Packaging

The Browser/Pyodide adapter should load or bundle the same Atlas IR schema and execution semantics exposed by `atlas_opt_core`. The current `PyodideBackend` is only a scaffold: it tracks not-loaded/loading/ready/error runtime states and returns explicit not-ready diagnostics. Future work should add Pyodide package loading under `apps/web/src/atlas/execution` without importing Pyodide from GUI views, panels, or model-state modules.
