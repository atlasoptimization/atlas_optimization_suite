# Atlas Optimization Suite Prototype Plan

## Current Repository Audit

This repository is currently the Data Science Deck app. It is a pnpm workspace with a React/TypeScript Vite frontend in `apps/web`, a shared deck asset package in `packages/deck-assets`, release/deployment scripts in `scripts`, and documentation in `docs`.

Frontend stack:

- Framework: React with TypeScript.
- Build tooling: Vite, `tsc -b`, pnpm workspace scripts.
- State management: local React state plus reducer-style domain state in `apps/web/src/engine/sessionReducer.ts`; undo/redo is handled by `apps/web/src/engine/sessionHistory.ts`.
- Styling: plain CSS through `apps/web/src/style.css`, `apps/web/src/index.css`, and component class names.
- Desk/canvas: `react-zoom-pan-pinch` around a large finite tabletop in `apps/web/src/ui/tableau/Tableau.tsx`.
- Persistence: browser local storage helpers in `apps/web/src/storage`.
- Tests: Vitest via the root `pnpm test` script; current tests live mainly in `apps/web/tests/engine.test.ts`.
- Lint: ESLint config exists in `apps/web/eslint.config.js`, but no package script currently exposes lint.

The repository has no backend package yet. The long-term backend should be added under `backend/` as a Python package plus thin FastAPI routes, not mixed into the React app.

## Read Prompt Plan

`codex_prompts.odt` was inspected. The planned build sequence is:

1. Repository audit and implementation plan.
2. Atlas UI skeleton with toolbar, workbench, dock, inspector, and solution panel.
3. Pan/zoom workbench, draggable typed cards, selection, creation, deletion, and local persistence.
4. Typed tags, editable properties, templates, and visual groups.
5. Query builder, property selectors, `TaggedSum` functions, and dependency highlighting.
6. Objectives, constraints, local evaluation, and symbolic math previews.
7. Python modeling core: schema, `AtlasDesk`, registries, queries, expressions, evaluator, functions, objectives, constraints, KPIs, reports, optimizer orchestration.
8. Atlas IR export/import, FastAPI validation/evaluation/codegen/solve endpoints, frontend-backend integration, then minimal CVXPY solving.

## Repository Disposition Flags

Keep these flags current as implementation proceeds. Do not delete flagged components until the Atlas prototype is stable and a separate cleanup task confirms they are unused.

Flag meanings:

- `REUSE`: useful directly for Atlas.
- `ADAPT`: useful pattern or implementation, but rename or reshape for Atlas semantics.
- `QUARANTINE`: not useful for the Atlas product direction, but keep temporarily to preserve the existing app.
- `REVIEW`: decide after the Atlas vertical slice exists.

| Area | Flag | Notes |
| --- | --- | --- |
| `apps/web/src/ui/tableau/Tableau.tsx`, `CardInstanceView.tsx`, minimap/navigation | `ADAPT` | Reuse pan/zoom, drag, selection, minimap, and large-desk behavior. Replace deck/pile assumptions with Atlas cards and modeling objects. |
| `apps/web/src/engine/sessionReducer.ts` and `sessionHistory.ts` | `ADAPT` | Reducer and undo/redo patterns are valuable. Atlas should get its own reducer/state namespace instead of extending deck actions indefinitely. |
| `apps/web/src/storage/*Session*`, import/export helpers | `ADAPT` | Reuse normalization, local storage, JSON export/download patterns. Add Atlas IR-specific persistence separately. |
| `apps/web/src/ui/inspector/*` | `ADAPT` | Inspector shell is useful. Replace card-reading fields with tags, properties, query/function/objective/constraint editors. |
| `apps/web/src/ui/layout/*`, `MenuBar.tsx`, `FloatingPanel.tsx` | `REUSE` | Useful for toolbar/panels/dialogs in the prototype. |
| `apps/web/src/ui/search/CardSearchPalette.tsx` | `ADAPT` | Search UI is useful. Atlas search should search cards, tags, properties, queries, functions, and constraints. |
| `apps/web/src/export/*` | `ADAPT` | Export patterns are useful. Session markdown/AI context are deck-specific and should not drive Atlas IR design. |
| `apps/web/src/ui/draw`, `ui/piles`, `modes`, `content/guide`, `demo` | `QUARANTINE` | Deck-game behavior is not central to Atlas optimization modeling. Keep while existing app is preserved. |
| `packages/deck-assets`, `scripts/*asset*`, deployment profiles | `QUARANTINE` | Deck asset pipeline is not needed for Atlas modeling. Keep until the Atlas app no longer depends on deck manifests/assets. |
| `customCards`, `customDomains`, related docs/templates | `REVIEW` | Could inform future importable object libraries, but current implementation is deck-domain specific. |
| `apps/web/src/assets/loadManifest.ts` and deck manifest types | `QUARANTINE` | Atlas should not require a deck manifest for core operation. |

## Architecture Decision

Create a new Atlas app surface inside the existing `apps/web` package first, rather than creating a separate frontend package immediately.

Rationale:

- The existing app already has working Vite/React/TypeScript, pan/zoom desk code, local persistence, undo/redo, export, inspector, dialogs, and tests.
- A new app package would duplicate build/test wiring before the prototype proves its shape.
- Keeping Atlas in `apps/web/src/atlas` allows the existing app to keep running while Atlas replaces entry points gradually.

Initial route strategy:

- Add `apps/web/src/atlas` with Atlas-specific model, reducer, persistence, components, and styles.
- Add a small app-mode switch or route-like entry in `App.tsx` only when Prompt 2 implements the UI skeleton.
- Do not mutate deck session types into Atlas model types. Use adapters only where shared UI components require them.

## Proposed Frontend Structure

Create these files/components next:

- `apps/web/src/atlas/core/types.ts`: Atlas domain types for cards, tags, properties, layout, groups, queries, expressions, functions, objectives, constraints, diagnostics, and IR metadata.
- `apps/web/src/atlas/core/ids.ts`: id helpers for cards, groups, queries, objectives, and constraints.
- `apps/web/src/atlas/core/reducer.ts`: Atlas workbench reducer with explicit actions and undoable state updates.
- `apps/web/src/atlas/core/history.ts`: thin wrapper following the existing `sessionHistory.ts` pattern.
- `apps/web/src/atlas/storage/localAtlasStorage.ts`: local storage load/save for Atlas workbench state.
- `apps/web/src/atlas/ir/atlasIr.ts`: IR export/import and version helpers.
- `apps/web/src/atlas/ui/AtlasApp.tsx`: top-level Atlas prototype layout.
- `apps/web/src/atlas/ui/AtlasToolbar.tsx`: Evaluate, Solve, Inspect/Validate, Export, Undo, Redo, Search.
- `apps/web/src/atlas/ui/workbench/AtlasWorkbench.tsx`: pan/zoom workbench wrapper, initially adapted from `Tableau.tsx`.
- `apps/web/src/atlas/ui/workbench/AtlasCardView.tsx`: generic card rendering by Atlas card type.
- `apps/web/src/atlas/ui/inspector/AtlasInspector.tsx`: selected card/group/query/function/objective/constraint editor shell.
- `apps/web/src/atlas/ui/dock/AtlasModelDock.tsx`: objectives and constraints dock.
- `apps/web/src/atlas/ui/solution/AtlasSolutionPanel.tsx`: diagnostics, evaluation, and solve results.
- `apps/web/src/atlas/ui/search/AtlasSearchPalette.tsx`: search across Atlas modeling objects.
- `apps/web/tests/atlas/*.test.ts`: focused unit tests for Atlas state helpers as they are introduced.

## Prototype Frontend Milestones

1. UI skeleton: render Atlas toolbar, workbench, bottom dock, inspector/solution panel, safe no-op actions, and empty state.
2. Workbench cards: create/select/drag/delete six generic card types: `object`, `decision`, `data`, `function`, `constraint`, `objective`.
3. Persistence: save Atlas state to local storage and keep JSON-serializable model data separate from transient UI state.
4. Tags/properties: inspector editing with validation and compact card summaries.
5. Templates/groups: simple starter templates and visual grouping only; groups do not imply query membership.
6. Queries/functions: query by typed tags, property selectors, `TaggedSum`, diagnostics, and dependency highlighting.
7. Objectives/constraints/evaluation: model dock, expression evaluation, symbolic previews, and diagnostics.
8. IR export/import: versioned Atlas IR with roundtrip tests.

Current implementation status:

- Batch 1 / Prompt 2 completed the Atlas app shell under `apps/web/src/atlas/ui` and made it the default app entry, while keeping the Data Science Deck available through `?app=deck` or `#deck`.
- Batch 1 / Prompt 3 added the first Atlas card model, reducer, local storage persistence, create/select/drag/delete behavior, and a large pan/zoom workbench using the existing `react-zoom-pan-pinch` dependency.
- Batch 2 / Prompt 1 added editable typed tags with generic quick-add presets, card tag chips, inspector add/edit/delete controls, empty-key validation, and local persistence through the existing Atlas workbench storage.
- Batch 2 / Prompt 2 added editable card properties with `constant`, `formula`, `decision_ref`, and `data_ref` kinds, compact card summaries, inspector add/edit/delete controls, empty-name validation, and persistence normalization for optional units and notes.
- Batch 2 / Prompt 3 added code-defined card templates, a toolbar template picker with descriptions, template-based card creation, and independent copying of starter tags/properties including the non-engine Product-like Object example.
- Batch 2 / Prompt 4 added visual groups as separate workbench objects with title, position, size, optional color, notes, inspector editing, deletion without deleting cards, rendering behind cards, and local persistence.
- Batch 3 / Prompt 1 added persisted named card queries with include/exclude typed-tag conditions, AND include semantics, exclusion filtering, a side-panel query builder, match counts/lists, and live workbench highlighting independent from visual groups.
- Batch 3 / Prompt 2 added a serializable expression reference model, property-name collection from selected query matches, missing-property diagnostics, a property selector panel, expression preview rendering, and JSON preview for simple property/literal/multiply references without evaluation.
- Batch 3 / Prompt 3 added Function-card `TaggedSum` configuration with query selection, simple property/property and property/literal expressions, card-face previews, selected-function match highlighting, missing-property diagnostics, and local persistence without numerical evaluation.
- Batch 3 / Prompt 4 added transient Function-card dependency visualization: selected TaggedSum cards highlight matched query cards, mark expression properties on those cards, and show query/match/property/missing-property summaries with a highlight toggle. Dependency lines remain future work because the current pan/zoom workbench does not provide stable edge primitives yet.
- Batch 4 / Prompt 1 added Objective-card configuration with minimize/maximize direction, ordered editable Function-card terms, compact card previews, bottom-dock objective listings, objective dependency summaries, and transient highlighting for referenced functions and focused term participants.
- Batch 4 / Prompt 2 added Constraint-card configuration with left/right Function-or-constant expressions, `<=`, `=`, and `==` operators, compact mathematical previews, bottom-dock constraint listings, dependency summaries, and transient highlighting through referenced functions.
- Batch 4 / Prompt 3 added a solver-independent prototype evaluation subsystem for constants, property references, multiplication/addition, TaggedSum functions, objectives, and constraint sides, with toolbar-triggered evaluation results and readable diagnostics in the inspector.
- Batch 4 / Prompt 4 added backend-independent symbolic mathematics rendering for TaggedSum, objectives, and constraints, including generated-math inspector previews and expandable participating-object details.
- Batch 5A / Prompts 1-3 added a separate Python `backend/atlas_opt` modeling core skeleton, Pydantic Atlas IR schema models, semantic `AtlasDesk` registries, card/property lookup helpers, diagnostics, backend README, and pytest coverage. FastAPI and CVXPY remain separate future layers.
- Batch 5A / Prompts 4-6 added the Python typed-tag query engine, structured expression AST/evaluator, and semantic TaggedSum function with deterministic query results, property diagnostics, dependency extraction, symbolic previews, and `AtlasDesk.evaluate_query(...)` / `AtlasDesk.evaluate_function(...)` integration.
- Batch 5A / Prompts 7-8 added semantic Objective, Constraint, KPI, and Report objects; `AtlasDesk` objective/constraint/KPI evaluation; `AtlasOptimizer` orchestration with validate/evaluate/generate-code/solve methods; and thin FastAPI routes in `backend/atlas_api.py`. CVXPY remains unimplemented, and local FastAPI endpoint tests are skipped until the declared backend dependency is installed.
- Batch 5 / Prompts 1-3 added explicit frontend Atlas IR export/import with schema version `0.1`, readable JSON download, roundtrip validation helpers, centralized backend API client configuration, backend health/CORS route support, and toolbar Inspect validation that sends IR to `/validate` while keeping local editing usable if the backend is unavailable.
- Batch 5 / Prompts 4-5 wired frontend Evaluate/Solve to backend `/evaluate` and `/solve` with local evaluation fallback, added backend evaluation result summaries, implemented a minimal CVXPY compiler/solve backend for continuous scalar linear models, and exposed generated readable CVXPY code. Local CVXPY-dependent tests skip until the declared backend dependency is installed.
- The disposition flags above remain valid: the existing Data Science Deck tabletop remains `ADAPT`, while deck-specific piles, draw modes, asset pipelines, and guide/demo content remain `QUARANTINE` until Atlas no longer depends on them.

## Frontend/Backend Split

Frontend responsibilities:

- Edit and persist Atlas workbench state.
- Render the workbench, cards, groups, queries, expressions, objectives, constraints, diagnostics, and solution results.
- Provide immediate local validation for obvious UI errors.
- Export/import Atlas IR JSON.
- Call backend endpoints when available, while remaining usable offline for editing.

Backend responsibilities:

- Validate Atlas IR with Pydantic schema models.
- Compile raw IR into a semantic `AtlasDesk`.
- Evaluate queries, expressions, functions, objectives, constraints, KPIs, and reports.
- Generate diagnostics with stable ids that map back to frontend objects.
- Later compile a supported subset to CVXPY and solve.

Backend package plan:

- `backend/atlas_opt/schema.py`: raw Pydantic IR models.
- `backend/atlas_opt/desk.py`: `AtlasDesk` construction and registries.
- `backend/atlas_opt/cards.py`, `properties.py`, `queries.py`, `expressions.py`, `functions.py`, `objectives.py`, `constraints.py`: semantic model layers.
- `backend/atlas_opt/diagnostics.py`: structured diagnostics.
- `backend/atlas_opt/evaluator.py`: pure evaluation independent from CVXPY.
- `backend/atlas_opt/compiler.py`, `cvxpy_backend.py`: later code generation and solver compilation.
- `backend/atlas_opt/optimizer.py`: orchestration facade used by FastAPI.
- `backend/app/main.py`: thin FastAPI routes only.

## High-Level Atlas IR JSON

The IR should be backend-independent and versioned. It should not include hover state, selected object ids, transient highlights, panel positions, or other UI-only state.

```json
{
  "schemaVersion": "0.1",
  "metadata": {
    "id": "model_...",
    "title": "Untitled Atlas model",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  },
  "cards": [
    {
      "id": "card_...",
      "type": "object",
      "title": "Object",
      "tags": [{ "key": "type", "value": "product" }],
      "properties": [
        {
          "id": "prop_...",
          "name": "unit_cost",
          "kind": "constant",
          "value": 12,
          "unit": "USD",
          "notes": ""
        }
      ],
      "functionConfig": null,
      "objectiveConfig": null,
      "constraintConfig": null,
      "notes": "",
      "layout": { "x": 0, "y": 0, "width": 220, "height": 140 }
    }
  ],
  "groups": [
    {
      "id": "group_...",
      "title": "Group",
      "layout": { "x": 0, "y": 0, "width": 600, "height": 400 },
      "color": "blue",
      "notes": ""
    }
  ],
  "queries": [
    {
      "id": "query_...",
      "name": "Products",
      "includeTags": [{ "key": "type", "value": "product" }],
      "excludeTags": []
    }
  ],
  "objectives": [
    {
      "cardId": "card_...",
      "direction": "minimize",
      "terms": [{ "id": "term_...", "name": "Cost", "functionCardId": "card_..." }]
    }
  ],
  "constraints": [
    {
      "cardId": "card_...",
      "name": "Capacity",
      "left": { "kind": "function_ref", "functionCardId": "card_..." },
      "operator": "<=",
      "right": { "kind": "literal", "value": 100 }
    }
  ]
}
```

Expression objects should initially support `literal`, `property_ref`, `add`, `multiply`, and `function_ref`. `TaggedSum` function configuration should reference a named query and a structured expression, not a parsed free-form formula string.

## Practical Constraints

- Keep Atlas model data generic. Do not hard-code product/factory examples into core logic.
- Keep visual groups separate from query semantics.
- Keep frontend IR independent from CVXPY.
- Keep backend modeling logic outside FastAPI routes.
- Preserve the existing Data Science Deck until Atlas has equivalent startup/build/test coverage.

## Verification Log

Commands to run for this audit:

- `pnpm test`
- `pnpm --filter @dsd/web build`

No lint command is currently defined in root or `apps/web/package.json`. If lint is needed in a later round, add an explicit script before treating lint as a required check.

## Batch 6 Prototype Status

- Solution results now persist in the right dock after Solve. The panel renders empty, loading, success, error, and stale states; shows solver status, objective value, diagnostics, decision variable values, constraint residuals when returned, and generated CVXPY code in a collapsible section.
- Decision results map back to Decision cards or decision-ref properties. Constraint results map back to their source Constraint cards, which reuses existing dependency highlighting.
- Evaluate has explicit modes for current initialization values and latest solution values. Latest-solution evaluation uses returned decision variable values and warns when the solution is stale or unavailable.
- Project JSON save/load wraps the Atlas IR in a small project envelope while preserving direct IR export/import.
- The built-in production planning example contains three product object cards tagged `type=product` and `factory=A`, decision-backed `production_quantity` properties, TaggedSum cards for profit and machine hours, a maximize-profit objective, and a machine-capacity constraint. The example is intentionally data-only; no evaluator/compiler logic is specific to products or factories.
- The command palette is available from the toolbar and `Ctrl/Cmd+K`. It supports quick card creation, template creation, load example, save project, export IR, evaluate, solve, and card search across title, card type, tags, and property names.
- Prototype readiness cleanup removed the disabled search placeholder, refreshed stale action copy, expanded regression tests for the core example/project/solution/search workflow, and documented setup, supported solver subset, and known limitations in the README.
- Batch 7 adds a structured linear term editor for TaggedSum expressions, decision-card scalar variable metadata (`continuous`, `integer`, `binary`, bounds, initial value), and CSV Data-card metadata/preview upload. The backend schema/evaluator/compiler now accepts decision metadata, emits mixed-integer solver warnings, compiles binary/integer CVXPY variables when CVXPY is installed, resolves small CSV `data_ref` preview values, and diagnoses missing data columns and unsupported nonlinear property products.
- Batch 7 / Prompt 4 adds finite Index Set support as Data-card metadata and lets properties/decision references declare `indexSetId`. The UI can create a Weeks 1..12 set and display `production_quantity[Weeks]` in cards and symbolic previews. Backend schema preserves indexed metadata; scalar CVXPY compilation intentionally warns that indexed expansion is not implemented yet.
- Batch 8 reuses Data Science Deck workbench resources in Atlas: the existing pan/zoom dependency and card movement model remain, Atlas cards now use the structured grey/green text-card visual language instead of defaulting to PDF display, and PDF/card-face support remains isolated to the original Deck workflow. Living-card modules (`tag`, `trait`, `property`, `diagnostic`, `note`) can be dragged from a palette onto cards, moved, edited, deleted, and persisted with the card JSON. Runtime diagnostics from evaluate/solve render near the right edge of cards, remain separate from model-defining properties, can be inspected, and solve-derived diagnostics become stale after model edits.

Verification for this batch:

- `pnpm test`
- `pnpm --filter @dsd/web build`
- `cd backend && python3 -m pytest`
- `cd backend && python3 -m compileall atlas_opt atlas_api.py`
