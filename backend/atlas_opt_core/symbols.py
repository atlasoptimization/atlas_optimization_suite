"""CVXPY symbol catalog generation and validation."""

from __future__ import annotations

import inspect
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


CATALOG_SCHEMA_VERSION = "0.1"
STABLE_GENERATED_AT = "1970-01-01T00:00:00Z"

CORE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = CORE_ROOT.parents[1]
BACKEND_GENERATED_PATH = CORE_ROOT / "generated" / "cvxpy_symbols.generated.json"
FRONTEND_GENERATED_PATH = REPO_ROOT / "apps" / "web" / "src" / "generated" / "cvxpy_symbols.generated.json"
OVERRIDES_PATH = CORE_ROOT / "config" / "cvxpy_symbol_overrides.json"
PSEUDO_SYMBOLS_PATH = CORE_ROOT / "config" / "cvxpy_pseudo_symbols.json"


class SymbolArgumentSpec(BaseModel):
    """One symbol argument."""

    name: str
    kind: str = "expression"
    default: Any | None = None
    ui: dict[str, Any] | None = None


class SymbolSpec(BaseModel):
    """Generated CVXPY/Atlas symbol metadata."""

    id: str
    name: str
    kind: str
    importPath: str | None = None
    module: str | None = None
    signature: str = "(*args)"
    arguments: list[SymbolArgumentSpec] = Field(default_factory=list)
    defaultValues: dict[str, str] = Field(default_factory=dict)
    doc: str = ""
    category: str = "CVXPY"
    source: str = "auto"
    callable: bool = False
    cvxpyVersion: str | None = None
    generatedAt: str
    availableIn: dict[str, Any] = Field(default_factory=lambda: {"local": True, "pyodide": "unknown"})
    ui: dict[str, Any] | None = None
    symbol: str | None = None
    examples: list[str] = Field(default_factory=list)
    warning: str | None = None
    note: str | None = None


class SymbolCatalog(BaseModel):
    """Generated symbol catalog."""

    schemaVersion: str
    cvxpyVersion: str | None = None
    generatedAt: str
    symbols: list[SymbolSpec]


@dataclass(frozen=True)
class SyncDiagnostic:
    """A non-fatal sync diagnostic."""

    level: str
    message: str


@dataclass
class GeneratedCatalog:
    """Generated catalog plus diagnostics."""

    catalog: dict[str, Any]
    diagnostics: list[SyncDiagnostic] = field(default_factory=list)


COMMON_SYMBOL_NAMES = [
    "norm",
    "sum",
    "sum_squares",
    "square",
    "abs",
    "maximum",
    "minimum",
    "pos",
    "neg",
    "quad_form",
    "hstack",
    "vstack",
    "bmat",
    "reshape",
    "vec",
    "promote",
    "Variable",
    "Parameter",
    "Constant",
    "Problem",
    "Minimize",
    "Maximize",
]

SYMBOL_KINDS_BY_NAME = {
    "Variable": "structural",
    "Parameter": "structural",
    "Constant": "structural",
    "Problem": "structural",
    "Minimize": "structural",
    "Maximize": "structural",
    "hstack": "affine",
    "vstack": "affine",
    "bmat": "affine",
    "reshape": "shape",
    "vec": "shape",
    "promote": "shape",
}


def generate_symbol_catalog(
    overrides_path: Path = OVERRIDES_PATH,
    pseudo_symbols_path: Path = PSEUDO_SYMBOLS_PATH,
    generated_at: str | None = None,
) -> GeneratedCatalog:
    """Generate a deterministic CVXPY/Atlas symbol catalog from local packages."""

    diagnostics: list[SyncDiagnostic] = []
    generated_at = generated_at or os.getenv("ATLAS_CVXPY_SYMBOLS_GENERATED_AT", STABLE_GENERATED_AT)
    try:
        import cvxpy as cp  # type: ignore
    except Exception as exc:
        cp = None
        cvxpy_version = None
        diagnostics.append(SyncDiagnostic("error", f"CVXPY import failed: {exc}"))
    else:
        cvxpy_version = getattr(cp, "__version__", None)

    symbols: dict[str, dict[str, Any]] = {}
    if cp is not None:
        for name in COMMON_SYMBOL_NAMES:
            value = getattr(cp, name, None)
            if value is not None:
                spec = symbol_from_callable(name, value, cvxpy_version, generated_at)
                symbols[spec["id"]] = spec
        discover_namespace_symbols(cp, symbols, cvxpy_version, generated_at)

    apply_overrides(symbols, load_json_object(overrides_path, diagnostics, "override"), diagnostics)
    for pseudo in load_pseudo_symbols(pseudo_symbols_path, diagnostics, cvxpy_version, generated_at):
        symbols[pseudo["id"]] = pseudo

    ordered_symbols = [symbols[key] for key in sorted(symbols)]
    catalog = {
        "schemaVersion": CATALOG_SCHEMA_VERSION,
        "cvxpyVersion": cvxpy_version,
        "generatedAt": generated_at,
        "symbols": ordered_symbols,
    }
    SymbolCatalog.model_validate(catalog)
    return GeneratedCatalog(catalog=catalog, diagnostics=diagnostics)


def catalog_json(catalog: dict[str, Any]) -> str:
    """Return stable generated JSON text."""

    return json.dumps(catalog, indent=2, sort_keys=True) + "\n"


def write_symbol_catalog(catalog: dict[str, Any], paths: list[Path] | None = None) -> None:
    """Write catalog JSON to backend and frontend generated asset paths."""

    for path in paths or [BACKEND_GENERATED_PATH, FRONTEND_GENERATED_PATH]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(catalog_json(catalog), encoding="utf-8")


def load_generated_catalog(path: Path = BACKEND_GENERATED_PATH) -> SymbolCatalog:
    """Load and validate a generated symbol catalog."""

    return SymbolCatalog.model_validate_json(path.read_text(encoding="utf-8"))


def symbol_from_callable(name: str, value: Any, cvxpy_version: str | None, generated_at: str) -> dict[str, Any]:
    """Build a SymbolSpec dict from a local Python callable/class."""

    signature = safe_signature(value)
    module = getattr(value, "__module__", "cvxpy")
    import_path = f"{module}.{getattr(value, '__name__', name)}"
    return {
        "id": import_path,
        "name": name,
        "kind": SYMBOL_KINDS_BY_NAME.get(name, "atom"),
        "importPath": import_path,
        "module": module,
        "signature": signature,
        "arguments": arguments_from_signature(value, signature),
        "defaultValues": default_values_from_callable(value),
        "doc": doc_excerpt(value),
        "category": category_for_symbol(name, module),
        "source": "auto",
        "callable": callable(value),
        "cvxpyVersion": cvxpy_version,
        "generatedAt": generated_at,
        "availableIn": {"local": True, "pyodide": "unknown"},
    }


def discover_namespace_symbols(cp: Any, symbols: dict[str, dict[str, Any]], cvxpy_version: str | None, generated_at: str) -> None:
    """Discover public callable CVXPY symbols from selected namespaces."""

    for module_name in ("cvxpy.atoms", "cvxpy.atoms.affine", "cvxpy.atoms.elementwise"):
        try:
            module = __import__(module_name, fromlist=["*"])
        except Exception:
            continue
        for name in dir(module):
            if name.startswith("_"):
                continue
            value = getattr(module, name, None)
            if not callable(value):
                continue
            if not getattr(value, "__module__", "").startswith("cvxpy"):
                continue
            spec = symbol_from_callable(name, value, cvxpy_version, generated_at)
            symbols.setdefault(spec["id"], spec)


def apply_overrides(symbols: dict[str, dict[str, Any]], overrides: dict[str, Any], diagnostics: list[SyncDiagnostic]) -> None:
    """Merge manual overrides into discovered symbols."""

    for symbol_id, override in overrides.items():
        if not isinstance(override, dict):
            diagnostics.append(SyncDiagnostic("error", f"Override {symbol_id} must be an object."))
            continue
        target = symbols.get(symbol_id)
        if target is None:
            diagnostics.append(SyncDiagnostic("warning", f"Override {symbol_id} did not match a discovered symbol."))
            continue
        for key, value in override.items():
            if key == "arguments" and not isinstance(value, list):
                diagnostics.append(SyncDiagnostic("error", f"Override {symbol_id}.arguments must be a list."))
                continue
            target[key] = value
        target["source"] = "auto+override"


def load_pseudo_symbols(path: Path, diagnostics: list[SyncDiagnostic], cvxpy_version: str | None, generated_at: str) -> list[dict[str, Any]]:
    """Load pseudo symbols and normalize required generated fields."""

    raw = load_json_object(path, diagnostics, "pseudo")
    symbols = raw.get("symbols", raw if isinstance(raw, list) else [])
    if not isinstance(symbols, list):
        diagnostics.append(SyncDiagnostic("error", "Pseudo-symbol config must be a list or contain a symbols list."))
        return []
    normalized = []
    for item in symbols:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            diagnostics.append(SyncDiagnostic("error", "Pseudo-symbol entries must be objects with an id."))
            continue
        symbol = {
            "name": item.get("name") or item["id"].split(".")[-1],
            "kind": "operator",
            "signature": "(*args)",
            "arguments": [],
            "defaultValues": {},
            "doc": "",
            "category": "Operators",
            "callable": False,
            "availableIn": {"local": True, "pyodide": "unknown"},
            **item,
            "source": "pseudo",
            "cvxpyVersion": cvxpy_version,
            "generatedAt": generated_at,
        }
        normalized.append(SymbolSpec.model_validate(symbol).model_dump(mode="json", exclude_none=True))
    return normalized


def load_json_object(path: Path, diagnostics: list[SyncDiagnostic], label: str) -> Any:
    """Load a JSON config object or return an empty object with diagnostics."""

    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        diagnostics.append(SyncDiagnostic("error", f"Invalid {label} JSON {path}: {exc}"))
        return {}


def safe_signature(value: Any) -> str:
    """Return an inspect signature string when possible."""

    try:
        return str(inspect.signature(value))
    except (TypeError, ValueError):
        return "(*args)"


def arguments_from_signature(value: Any, signature_text: str) -> list[dict[str, Any]]:
    """Return JSON argument specs from a callable signature."""

    try:
        signature = inspect.signature(value)
    except (TypeError, ValueError):
        names = [part.strip().split("=", 1)[0] for part in signature_text.strip("()").split(",") if part.strip()]
        return [{"name": name.lstrip("*"), "kind": "expression"} for name in names if name not in {"*", "/", "*args", "**kwargs"}]
    arguments = []
    for name, parameter in signature.parameters.items():
        if name in {"args", "kwargs"}:
            continue
        entry: dict[str, Any] = {"name": name, "kind": "expression"}
        if parameter.default is not inspect.Parameter.empty:
            entry["default"] = jsonable_default(parameter.default)
            entry["kind"] = "parameter"
        arguments.append(entry)
    return arguments


def default_values_from_callable(value: Any) -> dict[str, str]:
    """Return callable defaults as stable strings."""

    try:
        signature = inspect.signature(value)
    except (TypeError, ValueError):
        return {}
    return {
        name: repr(parameter.default)
        for name, parameter in signature.parameters.items()
        if parameter.default is not inspect.Parameter.empty
    }


def jsonable_default(value: Any) -> Any:
    """Return a JSON-compatible default value."""

    if value is None or value is True or value is False or isinstance(value, (int, float, str)):
        return value
    return repr(value)


def doc_excerpt(value: Any, limit: int = 240) -> str:
    """Return a compact docstring excerpt."""

    return " ".join((inspect.getdoc(value) or "").split())[:limit]


def category_for_symbol(name: str, module: str) -> str:
    """Return a broad category for discovered symbols."""

    if name in {"norm"}:
        return "Norms"
    if name in {"sum_squares", "quad_form", "square"}:
        return "Quadratic"
    if name in {"hstack", "vstack", "bmat"}:
        return "Stacking"
    if name in {"reshape", "vec", "promote"}:
        return "Shape transforms"
    if name in {"Variable", "Parameter", "Constant", "Problem", "Minimize", "Maximize"}:
        return "Structural"
    if "elementwise" in module:
        return "Elementwise"
    if "affine" in module:
        return "Affine"
    return "Atoms"
