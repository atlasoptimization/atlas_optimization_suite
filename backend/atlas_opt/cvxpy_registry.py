"""CVXPY atom registry discovery and fallback metadata."""

from __future__ import annotations

import inspect
import json
from dataclasses import asdict, dataclass
from dataclasses import replace
from pathlib import Path
from types import ModuleType
from typing import Any


@dataclass(frozen=True)
class AtomSpec:
    """Serializable metadata for a CVXPY atom/function."""

    name: str
    importPath: str
    signature: str
    argumentNames: list[str]
    defaultValues: dict[str, str]
    doc: str
    category: str
    module: str
    callable: bool

    def to_dict(self) -> dict[str, Any]:
        """Return JSON-serializable atom metadata."""

        return asdict(self)


COMMON_ATOM_NAMES = [
    "sum",
    "norm",
    "sum_squares",
    "square",
    "abs",
    "maximum",
    "minimum",
    "pos",
    "neg",
    "quad_form",
]

OVERRIDE_FILE = Path(__file__).with_name("cvxpy_atom_overrides.json")

FALLBACK_SIGNATURES = {
    "sum": "(expr, axis=None, keepdims=False)",
    "norm": "(x, p=2, axis=None)",
    "sum_squares": "(expr)",
    "square": "(x)",
    "abs": "(x)",
    "maximum": "(*args)",
    "minimum": "(*args)",
    "pos": "(x)",
    "neg": "(x)",
    "quad_form": "(x, P)",
}

FALLBACK_DEFAULTS = {
    "sum": {"axis": "None", "keepdims": "False"},
    "norm": {"p": "2", "axis": "None"},
}


def discover_cvxpy_atoms() -> list[AtomSpec]:
    """Discover CVXPY atoms when installed, otherwise return common fallback specs."""

    try:
        import cvxpy as cp  # type: ignore
    except ModuleNotFoundError:
        return apply_atom_overrides(fallback_atoms())

    specs: dict[str, AtomSpec] = {}
    for name in COMMON_ATOM_NAMES:
        value = getattr(cp, name, None)
        if value is not None:
            specs[name] = atom_spec_from_callable(name, value, "cvxpy")

    for module_name in ("cvxpy.atoms", "cvxpy.atoms.affine", "cvxpy.atoms.elementwise"):
        try:
            module = __import__(module_name, fromlist=["*"])
        except Exception:
            continue
        discover_module_atoms(module, specs)

    return apply_atom_overrides(sorted(specs.values(), key=lambda spec: (spec.category, spec.name)))


def fallback_atoms() -> list[AtomSpec]:
    """Return a small common atom list for offline UI use."""

    return [
        AtomSpec(
            name=name,
            importPath=f"cvxpy.{name}",
            signature=FALLBACK_SIGNATURES.get(name, "(*args)"),
            argumentNames=argument_names_from_signature(FALLBACK_SIGNATURES.get(name, "(*args)")),
            defaultValues=FALLBACK_DEFAULTS.get(name, {}),
            doc="CVXPY atom metadata fallback. Start the backend with CVXPY installed for full introspection.",
            category="fallback",
            module="cvxpy",
            callable=False,
        )
        for name in COMMON_ATOM_NAMES
    ]


def apply_atom_overrides(atoms: list[AtomSpec], override_path: Path = OVERRIDE_FILE) -> list[AtomSpec]:
    """Apply optional UI metadata overrides while keeping discovery as the baseline."""

    overrides = load_atom_overrides(override_path)
    if not overrides:
        return atoms
    updated: list[AtomSpec] = []
    for atom in atoms:
        override = overrides.get(atom.name) or overrides.get(atom.importPath)
        if not override:
            updated.append(atom)
            continue
        fields = {key: value for key, value in override.items() if key in AtomSpec.__dataclass_fields__}
        updated.append(replace(atom, **fields))
    return updated


def load_atom_overrides(path: Path = OVERRIDE_FILE) -> dict[str, dict[str, Any]]:
    """Load optional atom metadata overrides from JSON."""

    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(value, dict):
        return {}
    return {
        str(key): override
        for key, override in value.items()
        if isinstance(override, dict)
    }


def discover_module_atoms(module: ModuleType, specs: dict[str, AtomSpec]) -> None:
    """Add public callables from a CVXPY module."""

    for name in dir(module):
        if name.startswith("_") or name in specs:
            continue
        value = getattr(module, name, None)
        if not callable(value):
            continue
        if getattr(value, "__module__", "").startswith("cvxpy"):
            specs[name] = atom_spec_from_callable(name, value, module.__name__)


def atom_spec_from_callable(name: str, value: Any, category: str) -> AtomSpec:
    """Build AtomSpec from a Python callable."""

    signature = safe_signature(value)
    return AtomSpec(
        name=name,
        importPath=f"{getattr(value, '__module__', 'cvxpy')}.{getattr(value, '__name__', name)}",
        signature=signature,
        argumentNames=argument_names_from_signature(signature),
        defaultValues=default_values_from_callable(value),
        doc=doc_excerpt(value),
        category=category,
        module=getattr(value, "__module__", category),
        callable=callable(value),
    )


def safe_signature(value: Any) -> str:
    """Return inspect signature where available."""

    try:
        return str(inspect.signature(value))
    except (TypeError, ValueError):
        return "(*args)"


def argument_names_from_signature(signature: str | None) -> list[str]:
    """Extract simple argument names from a signature string."""

    if not signature or not signature.startswith("("):
        return []
    body = signature.strip()[1:-1].strip()
    if not body:
        return []
    names = []
    for item in body.split(","):
        name = item.strip().split("=", 1)[0].strip()
        if name and name not in {"*", "/", "*args", "**kwargs"}:
            names.append(name.lstrip("*"))
    return names


def default_values_from_callable(value: Any) -> dict[str, str]:
    """Return parameter defaults as strings for JSON portability."""

    try:
        signature = inspect.signature(value)
    except (TypeError, ValueError):
        return {}
    defaults: dict[str, str] = {}
    for name, parameter in signature.parameters.items():
        if parameter.default is not inspect.Parameter.empty:
            defaults[name] = repr(parameter.default)
    return defaults


def doc_excerpt(value: Any, limit: int = 240) -> str:
    """Return a compact first-line doc excerpt."""

    doc = inspect.getdoc(value) or ""
    text = " ".join(doc.split())
    return text[:limit]
