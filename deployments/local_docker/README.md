# Local Docker Deployment

This deployment runs Atlas entirely on the user's machine:

- Frontend: static Vite build served by Nginx at `http://localhost:8080`
- Backend: local FastAPI/CVXPY service at `http://localhost:8000`

No Atlas-hosted server is required. Computation runs on client hardware through the local backend container.

## Start

From the repository root:

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

## Manual Tiny LP Checklist

1. Run `docker compose up --build`.
2. Open the frontend at `http://localhost:8080`.
3. Select `Local FastAPI` in the Atlas execution selector.
4. Load `Tiny LP` from Examples.
5. Click `Generate Code`.
6. Click `Solve`.
7. Verify `x = 2`, `y = 2`, and objective value `10`.

## Configuration

The frontend build receives:

```text
VITE_ATLAS_BACKEND_URL=http://localhost:8000
```

The backend CORS origins are controlled with:

```text
ATLAS_CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

Edit `docker-compose.yml` if ports or origins need to change.

## Local Build Check

```bash
docker compose build
```

This is a deployment wrapper check only. Core GUI/math feature code should remain under `apps/web/src/atlas` and `backend/atlas_opt`.
