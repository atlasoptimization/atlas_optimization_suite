"""Tests for CVXPY atom registry discovery."""

from atlas_opt.cvxpy_registry import discover_cvxpy_atoms


def test_atom_registry_returns_non_empty_list() -> None:
    atoms = discover_cvxpy_atoms()

    assert atoms


def test_common_atoms_are_available() -> None:
    atoms = {atom.name for atom in discover_cvxpy_atoms()}

    assert {"sum", "norm", "sum_squares", "square", "abs"}.issubset(atoms)


def test_atom_spec_json_serializes_cleanly() -> None:
    atom = discover_cvxpy_atoms()[0].to_dict()

    assert isinstance(atom["name"], str)
    assert isinstance(atom["importPath"], str)
    assert isinstance(atom["argumentNames"], list)

