"""FastAPI-independent Atlas CVXPY execution core."""

from .codegen import generate_code
from .inspector import inspect_ir, validate_ir
from .registry import capabilities, cvxpy_info, discover_atoms, discover_symbols
from .solver import solve_ir
from .symbols import SymbolCatalog, SymbolSpec, load_generated_catalog

__all__ = [
    "capabilities",
    "cvxpy_info",
    "discover_atoms",
    "discover_symbols",
    "generate_code",
    "inspect_ir",
    "solve_ir",
    "SymbolCatalog",
    "SymbolSpec",
    "load_generated_catalog",
    "validate_ir",
]
