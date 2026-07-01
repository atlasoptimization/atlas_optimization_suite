# Atlas Frontend Architecture

Atlas is moving toward a modular CVXPY-first workbench. The current frontend keeps the existing feature behavior while introducing registries and hosts that make future UI changes localized.

## App Shell

`apps/web/src/atlas/ui/layout/AtlasAppShell.tsx` defines the intended top-level shell slots:

- top toolbar/menu
- left dock
- center view area
- right dock
- overlays such as dialogs and context menus

The current `AtlasApp` still owns most runtime state, but new layout work should flow through shell/host components instead of embedding more layout structure directly into feature components.

## View Registry

Views are registered in `ui/views/viewRegistry.ts`.

Registered views:

- Object
- Atlas IR
- CVXPY Code
- Solution
- Diagnostics

To add a view:

1. Add the view component.
2. Add one descriptor to `ATLAS_VIEW_REGISTRY`.
3. Render it through the center `ViewHost`/view switch path.

## Panel Registry

Panels are registered in `ui/panels/panelRegistry.ts`.

Registered regions:

- `left`: Constructor, Explorer
- `right`: Inspector, Solution
- `bottom`: Objectives, Constraints

To add a panel, add a descriptor with `id`, `title`, `region`, and defaults. Panel visibility state should use `defaultAtlasPanelState()` and `toggleAtlasPanel()`.

## Command Registry

Global UI actions are described in `ui/appCommands.ts`.

Command descriptors include:

- id
- label
- menu
- shortcut
- disabled reason
- enabled predicate

Menus, toolbar buttons, command palette, and context menus should call command ids instead of duplicating action logic. `AtlasApp` currently maps command ids to the existing handlers through `handleAtlasCommand`.

To add a command:

1. Add an id to `AtlasCommandId`.
2. Add a descriptor to `ATLAS_COMMANDS`.
3. Implement execution in the central command handler.

## Menu Registry

`ui/appMenus.ts` assembles File/Edit/View/Run/Examples/Tools/Help from command descriptors. Menus should not hard-code action behavior.

Unsupported menu items should either:

- have `disabledReason`, or
- execute a command that shows a clear status message.

## Context Menu Registry

`ui/context/contextMenuRegistry.ts` declares menu items by target type:

- canvas
- node
- connection
- explorer

To add a context menu item:

1. Add it to the registry for the target.
2. Implement the command/action in the central context menu handler.

## Dialog Host

`ui/dialogs/DialogHost.tsx` and `ui/dialogs/dialogState.ts` define a central dialog state model. New modal workflows should use:

- `openAtlasDialog(...)`
- `closeAtlasDialog()`
- `DialogHost`

This avoids scattering modal state through unrelated panels.

## Drag And Drop

`ui/workbench/dragDrop.ts` centralizes drag payload parsing and coordinate conversion. New drag/drop flows should use these helpers for:

- Explorer object references
- atom specs
- attached modules
- canvas coordinate transforms

## Inspector Sections

The Inspector is moving toward section-based composition. Existing sections are grouped under summary, code, metadata, diagnostics, references, raw IR, properties, and advanced/debug. New sections should be implemented as isolated components and registered/configured by selected target type when possible.

## State Separation

Keep these separate:

- Model state: Atlas IR, model objects, workspace nodes/cards, connections.
- UI state: active view, selected item, open panels, dialogs, context menus.
- Execution state: selected backend, generated code, diagnostics, solution, stale/loading/error states.

Backend/execution calls must remain behind `apps/web/src/atlas/execution`.
