FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./pyproject.toml
COPY backend/atlas_api.py ./atlas_api.py
COPY backend/atlas_opt ./atlas_opt

RUN pip install --no-cache-dir -e . "uvicorn[standard]"

EXPOSE 8000

CMD ["uvicorn", "atlas_api:app", "--host", "0.0.0.0", "--port", "8000"]
