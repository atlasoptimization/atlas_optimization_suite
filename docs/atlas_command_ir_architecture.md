# Atlas Command and IR Architecture

Atlas now has a canonical command layer under `apps/web/src/app/commands`.
Menus, toolbar handlers, keyboard shortcuts, context menus, and future tutorial
actions should route user intent to canonical command ids such as
`file.clearDesk`, `edit.deleteSelected`, `workspace.placeReference`, and
`run.solve`.

State-changing commands produce reversible transactions from
`apps/web/src/app/transactions`. Transactions store before/after workbench state,
affected object ids, and `apply()` / `undo()` functions. The current UI still
uses the existing reducer for state changes, but command tests and new GUI code
should use transactions so undo/redo behavior stays consistent.

`apps/web/src/app/debug/eventLog.ts` records command execution, generated
transactions, backend summaries, diagnostics, and errors. It is intentionally
small and hidden by default so broken UI actions can be diagnosed without
spreading logging code through components.

Atlas IR current schema version is `0.3.0`. Frontend migrations live in
`apps/web/src/atlas/core/atlasIr/migrations`; backend migrations live in
`backend/atlas_opt_core/migrations`. Import paths should call `migrateIr` /
`migrate_ir` before validation. Exported IR keeps compatibility fields
(`workspaceNodes`, `connections`, `cards`) and also includes the `workspace`
envelope for layout/camera/panel state.

Backend capabilities are available at `GET /capabilities`. The response reports
CVXPY availability, installed solvers, supported operations, MILP support where
known, and symbol catalog metadata. Frontend execution adapters expose this via
`capabilities()` so views can gate Validate, Generate Code, Solve, and Evaluate
without guessing.

Golden examples live in `examples/golden`. Expected results live in
`examples/golden/expected`. Tiny LP is a fully solved regression fixture.
Least squares and ridge are ordinary Atlas IR fixtures with explicit pending
solve metadata until the matrix/quadratic compiler path is stabilized.

Typed visual wiring lives in `apps/web/src/atlas/core/ports.ts`. It defines the
shared port/slot type vocabulary (`scalar_expression`, `constraint`,
`objective`, `constraint_list`, and related types), derives slots/ports for
workspace cards, and validates compatibility before a connection mutates model
state. Visual node behavior is registered in
`apps/web/src/atlas/core/nodeTemplates.ts`; adding a new visual node should
start with a template instead of editing the whole canvas.

Diagnostics use the structured shape in
`apps/web/src/atlas/core/diagnostics.ts` and
`backend/atlas_opt_core/diagnostics.py`. Backend responses preserve legacy
`level/sourceId` fields for compatibility but also include
`severity/source/targetId/targetKind/suggestedFix/relatedIds`.

Project settings are explicit model state (`state.settings`) and are exported in
Atlas IR. Current settings include `defaultBackend`, `defaultSolver`,
`autoValidate`, `showAdvancedCvxpy`, `numberFormat`, and
`showDiagnosticsOnCanvas`.
