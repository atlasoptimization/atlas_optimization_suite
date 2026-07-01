"""Thin FastAPI wrapper around atlas_opt_core."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from atlas_opt.schema import AtlasIR
from atlas_opt_core import capabilities as core_capabilities, discover_atoms, discover_symbols, generate_code as core_generate_code, solve_ir, validate_ir
from atlas_opt_core.registry import cvxpy_info as core_cvxpy_info
from atlas_opt_core.solver import evaluate_ir


app = FastAPI(title="Atlas Optimization Suite API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ATLAS_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8080,http://127.0.0.1:8080",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Return backend health status."""

    return {"status": "ok", "core": "atlas_opt_core"}


@app.get("/cvxpy/info")
def cvxpy_info():
    """Return local CVXPY runtime information."""

    return core_cvxpy_info()


@app.get("/cvxpy/atoms")
def cvxpy_atoms():
    """Return discovered local CVXPY atom metadata."""

    return {"atoms": discover_atoms()}


@app.get("/cvxpy/symbols")
def cvxpy_symbols():
    """Return the generated CVXPY/Atlas symbol catalog."""

    return discover_symbols()


@app.get("/capabilities")
def capabilities():
    """Return backend execution capabilities."""

    return core_capabilities()


@app.post("/validate")
def validate(ir: AtlasIR):
    """Validate IR and return diagnostics/metadata."""

    return validate_ir(ir)


@app.post("/evaluate")
def evaluate(ir: AtlasIR):
    """Evaluate IR without solving."""

    return evaluate_ir(ir)


@app.post("/generate_code")
def generate_code(ir: AtlasIR):
    """Generate Python/CVXPY code."""

    return core_generate_code(ir)


@app.post("/solve")
def solve(ir: AtlasIR):
    """Solve Atlas IR through the core package."""

    return solve_ir(ir)
