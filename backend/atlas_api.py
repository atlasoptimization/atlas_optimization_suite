"""Compatibility module for the Atlas FastAPI app.

The implementation lives in ``api.main`` so route handlers remain a transport
adapter over the FastAPI-independent ``atlas_opt_core`` package.
"""

from api.main import app, capabilities, cvxpy_atoms, cvxpy_info, cvxpy_symbols, evaluate, generate_code, health, solve, validate

__all__ = [
    "app",
    "capabilities",
    "cvxpy_atoms",
    "cvxpy_info",
    "cvxpy_symbols",
    "evaluate",
    "generate_code",
    "health",
    "solve",
    "validate",
]
