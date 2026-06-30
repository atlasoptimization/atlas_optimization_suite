# Atlas Optimization Backend

The backend modeling core lives in `atlas_opt` and stays independent from FastAPI routes.
The active architecture direction is CVXPY-first: high-level semantic objects are compatibility
and future macro layers over a generic CVXPY graph.

Intended flow:

1. The GUI exports Atlas IR JSON.
2. `atlas_opt.schema` validates that JSON into typed Pydantic IR models.
3. `AtlasDesk.from_ir(...)` currently compiles validated IR into compatibility registries for cards, queries, objectives, constraints, diagnostics, and metadata.
4. The next core layer should add CVXPY registry/introspection so installed CVXPY atoms are exposed as generic `AtomSpec` metadata.
5. The evaluator, compiler, reports, KPIs, optimizer orchestration, and CVXPY backend operate on the compiled model.

FastAPI endpoints should remain thin transport adapters: receive JSON, validate IR, build an `AtlasDesk`, call the appropriate core service, and return structured results.

The first implemented CVXPY slice is intentionally small: scalar variables, constants, linear
TaggedSum compatibility expressions, linear objectives, and simple linear constraints. The next
implementation path is automatic CVXPY atom discovery and generic atom compilation rather than
manual frontend hard-coding of atoms.

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
