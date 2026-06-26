# Atlas Optimization Backend

The backend modeling core lives in `atlas_opt` and stays independent from FastAPI routes.

Intended flow:

1. The GUI exports Atlas IR JSON.
2. `atlas_opt.schema` validates that JSON into typed Pydantic IR models.
3. `AtlasDesk.from_ir(...)` compiles validated IR into semantic registries for cards, queries, objectives, constraints, diagnostics, and metadata.
4. The evaluator, compiler, reports, KPIs, optimizer orchestration, and CVXPY backend operate on `AtlasDesk`.

FastAPI endpoints should remain thin transport adapters: receive JSON, validate IR, build an `AtlasDesk`, call the appropriate core service, and return structured results.

The first CVXPY slice is intentionally small: continuous scalar decisions, constants, linear
TaggedSum expressions, linear objectives, and simple linear constraints.

## Local Development

Install backend dependencies in your Python environment, then run:

```bash
python3 -m pytest
uvicorn atlas_api:app --reload
```

Install the project dependencies from `pyproject.toml` before using `/solve`; without `cvxpy`,
the backend returns a readable `not_available` diagnostic instead of crashing.

The local frontend expects the backend at `http://localhost:8000` by default. Override with
`VITE_ATLAS_BACKEND_URL` when starting the web app.
