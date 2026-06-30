# CVXPY-First Architecture

## Direction

Atlas Optimization Suite is being reoriented as a generic graphical wrapper for CVXPY. The current core is the CVXPY modeling layer, not high-level domain objects such as Product, Factory, Truck, route, inventory item, or trait. Those concepts are future macro libraries that should compile down into the generic CVXPY layer.

The product should hard-code only the optimization skeleton:

- Variable
- Parameter
- Constant
- Constraint
- Objective
- Problem
- Solver
- Result
- Workspace Reference

CVXPY atoms and functions should not be manually recreated one by one in the frontend. The backend should discover the installed CVXPY capability surface and expose it as metadata.

## Layer Model

### 1. GUI Workbench

The frontend is a visual editor for a CVXPY-oriented graph.

Primary frontend responsibilities:

- Place and connect structural optimization nodes.
- Edit Variable, Parameter, Constant, Constraint, Objective, Problem, Solver, Result, and Workspace Reference objects.
- Render backend-provided CVXPY atom metadata through generic UI components.
- Render most CVXPY atoms with one generic `AtomNode` component driven by `AtomSpec`.
- Display backend diagnostics for shape, sign, curvature, DCP status, domain errors, solver errors, and result mapping.
- Preserve local editing, save/load, import/export, undo/redo, search, and solution inspection.

The frontend should not maintain its own hand-written catalog of CVXPY atoms. It may cache backend metadata for responsiveness, but the backend remains the source of truth.

### 2. Atlas IR

Atlas IR is the persistent JSON boundary between the GUI and backend. It should represent the graph and layout without committing to React state internals.

The CVXPY-first IR should evolve toward:

```json
{
  "schemaVersion": "0.2-cvxpy",
  "metadata": {
    "title": "Untitled CVXPY workspace"
  },
  "nodes": [
    {
      "id": "var_x",
      "kind": "variable",
      "name": "x",
      "shape": [],
      "attributes": { "nonneg": true },
      "layout": { "x": 120, "y": 160 }
    },
    {
      "id": "atom_sum",
      "kind": "atom",
      "atomId": "cvxpy.sum",
      "arguments": ["var_x"],
      "layout": { "x": 420, "y": 160 }
    }
  ],
  "constraints": [],
  "objective": {
    "direction": "minimize",
    "expression": "atom_sum"
  },
  "solver": {
    "name": null,
    "options": {}
  }
}
```

The existing `schemaVersion: "0.1"` card IR can remain supported as a compatibility/import layer. It should be treated as the previous experimental semantic-card layer and mapped into the CVXPY-first graph where possible.

### 3. Python CVXPY Registry And Introspection

The backend owns CVXPY metadata discovery.

Add a registry layer such as:

- `backend/atlas_opt/cvxpy_registry.py`
- `backend/atlas_opt/atoms.py`
- `backend/atlas_opt/cvxpy_introspection.py`

The registry should inspect the installed CVXPY package and expose serializable `AtomSpec` records:

```json
{
  "id": "cvxpy.sum",
  "name": "sum",
  "module": "cvxpy.atoms",
  "category": "reduction",
  "arity": { "min": 1, "max": 2 },
  "parameters": [
    { "name": "axis", "kind": "optional" },
    { "name": "keepdims", "kind": "optional" }
  ],
  "metadataAvailability": {
    "shape": true,
    "sign": true,
    "curvature": true,
    "dcp": true,
    "domain": true
  }
}
```

The first registry pass can be pragmatic:

- Discover callable atoms from CVXPY modules.
- Record names, module paths, signatures, doc summaries, and argument names.
- Maintain a small denylist for internal/private callables.
- Avoid hand-defining every atom.

Later passes should instantiate trial expressions where safe to ask CVXPY for:

- shape
- sign
- curvature
- DCP/DGP/DQCP status
- domain constraints
- validation diagnostics

### 4. Compiler And Executor

The compiler turns Atlas IR into actual CVXPY objects.

Compiler responsibilities:

- Build `cp.Variable`, `cp.Parameter`, and constants.
- Resolve workspace references.
- Instantiate atom calls from backend registry ids.
- Build constraints and objective.
- Build `cp.Problem`.
- Validate DCP status and return diagnostics before solving.
- Generate readable Python/CVXPY code for export and debugging.

Executor responsibilities:

- Select solver or use CVXPY default selection.
- Apply solver options.
- Call `problem.solve(...)`.
- Return solver status, objective value, variable values, parameter values where relevant, constraint residuals, duals when available, and diagnostics.

FastAPI routes should remain thin transport adapters around this core.

### 5. Solution And Results

Results should map back to frontend graph nodes.

Required result objects:

- Solver status.
- Objective value.
- Variable values.
- Constraint residuals and dual values when available.
- DCP/domain diagnostics.
- Generated CVXPY code.
- Execution warnings and solver errors.

The frontend Solution panel should remain persistent and trace clickable results back to source nodes/properties.

## Atom Rendering Strategy

Most atoms should render through one generic component:

- `AtomNode`
- inputs derived from `AtomSpec.parameters`
- arity and argument slots derived from `AtomSpec.arity`
- validation badges from backend diagnostics
- shape/sign/curvature badges from backend metadata

Only high-value atoms need custom visual wrappers later, and those wrappers should delegate to the same `AtomSpec` model rather than fork the semantics.

## Current Codebase Mapping

Current implementation pieces to preserve:

- Pan/zoom workbench and card movement.
- Toolbar, Constructor, Inspector, bottom dock, Solution panel.
- Local persistence, project save/load, IR export/import.
- Backend Pydantic validation, FastAPI thin routes, optimizer facade.
- Existing minimal CVXPY backend for scalar linear examples.
- Generated CVXPY code display and solve results.

Current implementation pieces to treat as compatibility or macro experiments:

- Object cards.
- Typed tags and query-based indexing.
- Product-like template.
- Production-planning example.
- Trait modules.
- TaggedSum semantic functions.
- High-level objective/constraint editors built around Function cards.

These are not deleted because they are useful experiments and preserve existing functionality. They should not define the core architecture. Long term, they become optional macro packages that emit CVXPY-first IR.

## Immediate Implementation Path

1. Add backend `AtomSpec` schema models.
2. Add `cvxpy_registry.py` that discovers installed CVXPY atoms and returns stable metadata.
3. Add FastAPI endpoint `GET /cvxpy/atoms`.
4. Add frontend API client for atom metadata.
5. Add frontend `AtomNode` and a generic atom picker.
6. Add CVXPY-first node kinds beside the compatibility card model.
7. Add compiler path from CVXPY-first IR to CVXPY objects.
8. Keep old semantic cards as importable macro/legacy nodes until migration is complete.

## Non-Goals For This Layer

- No Product/Factory/Truck-specific logic.
- No one-off manual atom catalog in React.
- No frontend-only DCP checker.
- No solver logic hidden in FastAPI endpoints.
- No hard-coded business archetypes in the core.

