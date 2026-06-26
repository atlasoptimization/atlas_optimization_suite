"""Thin FastAPI routes for Atlas backend operations."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from atlas_opt.optimizer import AtlasOptimizer
from atlas_opt.schema import AtlasIR


app = FastAPI(title="Atlas Optimization Suite API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Return backend health status."""

    return {"status": "ok"}


@app.post("/validate")
def validate(ir: AtlasIR):
    """Validate IR and return modeling-core diagnostics."""

    return AtlasOptimizer.from_ir(ir).validate()


@app.post("/evaluate")
def evaluate(ir: AtlasIR):
    """Evaluate IR through AtlasDesk and AtlasOptimizer."""

    return AtlasOptimizer.from_ir(ir).evaluate()


@app.post("/generate_code")
def generate_code(ir: AtlasIR):
    """Return a not-implemented code-generation diagnostic."""

    return AtlasOptimizer.from_ir(ir).generate_code()


@app.post("/solve")
def solve(ir: AtlasIR):
    """Return a not-implemented solve diagnostic."""

    return AtlasOptimizer.from_ir(ir).solve()
