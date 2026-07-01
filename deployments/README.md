# Atlas Deployment Wrappers

This folder is reserved for deployment-specific packaging. Product features belong in `apps/web/src/atlas` and `backend/atlas_opt`; runtime-specific frontend calls belong behind `apps/web/src/atlas/execution`.

Planned wrappers:

- `github_pages/`: static frontend build for demos, with Browser/Pyodide execution when available.
- `local_docker/`: local FastAPI/CVXPY backend plus frontend packaging.
- `colab/`: notebook/script export support for Colab execution.

Current development modes:

- `Mock`: runs without Python and returns deterministic UI-development results.
- `Local FastAPI`: calls the local backend endpoints at the centralized backend client base URL.
- `Browser/Pyodide`: scaffolded browser runtime adapter; CVXPY solving is pending.
- `Colab Export`: generates a Colab-ready notebook from the current Atlas IR; solve happens in Colab, not inside the GUI.

Local Docker:

```bash
docker compose up --build
```

Then open `http://localhost:8080` and select `Local FastAPI`.

Colab zero-hosting demo:

1. Build or run the frontend.
2. Load a model such as Tiny LP.
3. Use `File -> Export to Colab notebook`.
4. Upload the generated `.ipynb` to Colab and run all cells.

Do not add solver or modeling logic here. Deployment folders should only configure and package existing product and execution adapter layers.
