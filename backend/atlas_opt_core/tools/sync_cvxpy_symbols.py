"""Synchronize local CVXPY symbols into generated Atlas catalogs."""

from __future__ import annotations

import argparse
import difflib
import sys
from pathlib import Path

from atlas_opt_core.symbols import (
    BACKEND_GENERATED_PATH,
    FRONTEND_GENERATED_PATH,
    catalog_json,
    generate_symbol_catalog,
    write_symbol_catalog,
)


def main(argv: list[str] | None = None) -> int:
    """Run the CVXPY symbol synchronization command."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check generated files without writing.")
    args = parser.parse_args(argv)

    result = generate_symbol_catalog()
    desired = catalog_json(result.catalog)
    paths = [BACKEND_GENERATED_PATH, FRONTEND_GENERATED_PATH]

    for diagnostic in result.diagnostics:
        print(f"{diagnostic.level}: {diagnostic.message}", file=sys.stderr)

    if args.check:
        failed = False
        for path in paths:
            current = path.read_text(encoding="utf-8") if path.exists() else ""
            if current != desired:
                failed = True
                print(f"CVXPY symbol catalog out of sync: {path}", file=sys.stderr)
                print(
                    "".join(
                        difflib.unified_diff(
                            current.splitlines(keepends=True),
                            desired.splitlines(keepends=True),
                            fromfile=str(path),
                            tofile=f"{path} (generated)",
                            n=3,
                        )
                    ),
                    file=sys.stderr,
                )
        if failed:
            return 1
        print(f"CVXPY symbol catalogs are in sync ({len(result.catalog['symbols'])} symbols).")
        return 0

    write_symbol_catalog(result.catalog, paths)
    print(f"Wrote {len(result.catalog['symbols'])} CVXPY symbols:")
    for path in paths:
        print(f"  {Path(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
