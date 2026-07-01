"""Compiler compatibility exports for the Atlas execution core."""

from atlas_opt.cvxpy_backend import generate_cvxpy_code, solve_problem

__all__ = ["generate_cvxpy_code", "solve_problem"]
