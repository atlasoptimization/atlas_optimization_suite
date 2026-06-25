# UI Control Audit

Date: 2026-05-17

Scope: visible app controls in the top bar, floating panels, tableau overlays, draw/pile flows, context menus, and modal dialogs. This audit intentionally excludes generated deck assets and private source material.

## Top Bar

| Control | Expected behavior | Status | Notes |
| --- | --- | --- | --- |
| File | Opens save/load/export commands | Implemented | JSON import/export, local save/load, Markdown report, desk PNG, and Clear are wired. PDF export items are intentionally not shown. |
| Edit | Opens editing commands | Implemented | Search cards, Undo, and Redo are wired. Undo/Redo disable when unavailable. |
| View | Opens View Settings panel | Implemented | Panel close/minimize work; Escape closes the floating panel. |
| Mode | Opens Game Mode panel | Implemented | Uses structured grouped mode chooser. |
| Session | Opens Session panel | Implemented | Metadata, synthesis, log, and Markdown preview are wired. |
| Help | Opens Help / Guide panel | Implemented with one correction | The full handbook link is now disabled when the PDF is not bundled. |
| Developer | Opens diagnostics panel | Implemented | Copy AI context reports success/failure. Consider hiding in non-dev builds later. |
| Draw next | Executes current mode recommendation or fallback draw | Implemented | Disabled when current recommendation is complete/unavailable. |
| Add note | Creates note | Implemented | Uses reducer action. |
| Add arrow | Creates arrow | Implemented | Uses reducer action. |
| Clear | Clears current board/session state after confirmation | Implemented | Does not delete canonical deck data. |
| Actions | Opens draw actions popover | Improved | Escape and outside click now close the popover/dialog. |

## Panels

| Panel | Expected behavior | Status | Notes |
| --- | --- | --- | --- |
| View Settings | Controls board/card/panel display | Implemented | Includes minimap toggle, current-board presets, and new-card defaults. |
| Mode panel | Selects and guides modes | Implemented | Grouped, searchable, expandable mode list. |
| Session panel | Edits session metadata/log/synthesis | Implemented | Log clear is wired. |
| Help panel | Shows concise in-app guide | Implemented | Full handbook is disabled unless bundled by build configuration. |
| Developer panel | Diagnostics | Implemented | Small diagnostic surface only. |
| Inspector | Edits selected card/note/arrow | Implemented | Card hidden/ablation/display controls are wired. |
| Browser | Filters and places cards | Implemented | Uses current new-card defaults through central action enrichment. |
| Draw choice modal | Choose one candidate | Implemented | Escape cancels; candidate previews preserve portrait card aspect ratio. |
| Pile inspector | Inspect remaining pile cards | Implemented | Escape closes; specific draw and hidden draw are wired. |
| Discard inspector | Inspect/play/return discarded cards | Implemented | Escape closes. |
| New session wizard | Guides session startup | Implemented | Reuses grouped mode chooser and does not auto-open a duplicate Mode panel after start. |

## Context Menus

| Context menu | Expected behavior | Status | Notes |
| --- | --- | --- | --- |
| Card | Orientation, display, size, secret, study, actions, discard | Implemented | Size slider reflects actual card scale. Orientation remains semantic. |
| Draw pile | Filtered draw and pile operations | Implemented | Empty subsets are disabled or show "No cards available". |
| Discard pile | Inspect, play first, return all | Implemented | Empty actions are disabled. |
| Arrow | Delete arrow | Implemented | Whole-arrow drag and endpoint drag are supported. |
| Note | Delete note | Implemented | Minimal but wired. |

## Test IDs Added

Stable `data-testid` hooks were added for smoke-testable controls:

- `topbar-draw-next`
- `topbar-clear`
- `menu-file`
- `menu-edit`
- `menu-view`
- `menu-mode`
- `menu-session`
- `menu-help`
- `menu-developer`
- `menu-actions`
- `view-settings-panel`
- `mode-panel`
- `session-panel`
- `help-panel`
- `tableau`
- `minimap`
- `card-instance`
- `domain-pile-<Domain>`
- `discard-pile-<Domain>`
- `draw-dialog`
- `draw-choice-modal`
- `pile-inspector`
- `discard-inspector`
- `new-session-wizard`
- `card-search-palette`

## Remaining Manual Smoke Checklist

1. Start app and complete/cancel the New Session wizard.
2. Select Free, Standard, Source Review, and Abstraction modes.
3. Use top-bar Draw Next in each selected mode.
4. Right-click a card and change orientation, display, hidden state, size, and ablation.
5. Right-click each pile type and inspect/draw/play/return cards.
6. Open View, Session, Help, and Developer panels; verify Close, Minimize, and Escape.
7. Toggle minimap, browser, inspector, pile bar, topology, and grid.
8. Export session JSON, import JSON, save/load local session, export Markdown, export desk PNG.
9. Add note and arrow; drag cards, notes, arrows, and arrow endpoints.
10. Use Actions -> Filtered draw and Choose 1 from N.
