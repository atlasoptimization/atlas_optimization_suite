"""Local CVXPY registry and runtime information."""

from __future__ import annotations

import platform
import hashlib
import json
from typing import Any

from atlas_opt.cvxpy_registry import AtomSpec, discover_cvxpy_atoms

from .symbols import SymbolSpec, load_generated_catalog


ATOM_REGISTRY_KINDS = {"atom", "affine", "shape"}


def discover_atoms() -> list[dict[str, Any]]:
    """Return generated CVXPY atom metadata as JSON-ready dicts.

    Runtime introspection is kept only as a fallback for development
    environments where the generated catalog has not been synchronized yet.
    """

    try:
        catalog = load_generated_catalog()
    except Exception:
        return [atom.to_dict() for atom in discover_cvxpy_atoms()]
    atoms = [
        symbol_to_atom_dict(symbol)
        for symbol in catalog.symbols
        if symbol.kind in ATOM_REGISTRY_KINDS and symbol.importPath
    ]
    return sorted(atoms, key=lambda atom: (atom["category"], atom["name"], atom["importPath"]))


def discover_symbols() -> dict[str, Any]:
    """Return the generated CVXPY/Atlas symbol catalog with check metadata."""

    catalog = load_generated_catalog()
    payload = catalog.model_dump(mode="json")
    stable_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return {
        **payload,
        "catalogGeneratedAt": catalog.generatedAt,
        "catalogHash": hashlib.sha256(stable_payload.encode("utf-8")).hexdigest(),
    }


def atom_specs() -> list[AtomSpec]:
    """Return locally discovered CVXPY atom specs as dataclass objects."""

    return discover_cvxpy_atoms()


def symbol_to_atom_dict(symbol: SymbolSpec) -> dict[str, Any]:
    """Adapt a generated SymbolSpec to the frontend AtomSpec response shape."""

    return {
        "name": symbol.name,
        "importPath": symbol.importPath or symbol.id,
        "displayName": symbol.name,
        "signature": symbol.signature,
        "argumentNames": [argument.name for argument in symbol.arguments],
        "defaultValues": symbol.defaultValues,
        "doc": symbol.doc,
        "category": symbol.category,
        "module": symbol.module or "",
        "callable": symbol.callable,
        "uiOverrides": {
            "source": symbol.source,
            "ui": symbol.ui,
            "symbol": symbol.symbol,
            "examples": symbol.examples,
            "warning": symbol.warning,
            "note": symbol.note,
        },
    }


def cvxpy_info() -> dict[str, Any]:
    """Return local CVXPY/Python runtime information."""

    try:
        import cvxpy as cp  # type: ignore
    except Exception as exc:
        return {
            "coreImportsSucceeded": True,
            "cvxpyAvailable": False,
            "cvxpyVersion": None,
            "installedSolvers": [],
            "pythonVersion": platform.python_version(),
            "diagnostics": [
                {
                    "level": "error",
                    "message": f"CVXPY import failed: {exc}",
                    "sourceId": "cvxpy",
                }
            ],
        }

    try:
        solvers = list(cp.installed_solvers())
    except Exception:
        solvers = []
    return {
        "coreImportsSucceeded": True,
        "cvxpyAvailable": True,
        "cvxpyVersion": getattr(cp, "__version__", None),
        "installedSolvers": solvers,
        "pythonVersion": platform.python_version(),
        "diagnostics": [],
    }


def capabilities() -> dict[str, Any]:
    """Return backend execution capabilities for frontend feature gating."""

    info = cvxpy_info()
    try:
        symbols = discover_symbols()
    except Exception as exc:
        symbols = {"catalogHash": None, "schemaVersion": None, "diagnostics": [{"level": "warning", "message": str(exc)}]}
    cvxpy_available = bool(info.get("cvxpyAvailable"))
    installed_solvers = info.get("installedSolvers") if isinstance(info.get("installedSolvers"), list) else []
    return {
        "backendId": "local-fastapi",
        "backendLabel": "Local FastAPI",
        "cvxpyAvailable": cvxpy_available,
        "cvxpyVersion": info.get("cvxpyVersion"),
        "availableSolvers": installed_solvers,
        "supportsValidate": True,
        "supportsGenerateCode": cvxpy_available,
        "supportsSolve": cvxpy_available and len(installed_solvers) > 0,
        "supportsEvaluate": True,
        "supportsMilp": any(str(solver).upper() in {"GLPK_MI", "CBC", "SCIP", "ECOS_BB", "GUROBI", "CPLEX", "MOSEK"} for solver in installed_solvers),
        "supportsSymbolCatalog": bool(symbols.get("symbols")),
        "symbolCatalogVersion": symbols.get("schemaVersion"),
        "symbolCatalogHash": symbols.get("catalogHash"),
        "maxRecommendedVariables": 10000,
        "warnings": [diagnostic.get("message") for diagnostic in [*info.get("diagnostics", []), *symbols.get("diagnostics", [])] if isinstance(diagnostic, dict) and diagnostic.get("level") in {"warning", "error"}],
    }
