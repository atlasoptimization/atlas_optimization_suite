# App Health Report

Date: 2026-05-17

## Summary

Performed a targeted UI/control audit across the top bar, floating panels, tableau overlays, modal dialogs, pile flows, and context menus. The pass focused on visible no-op controls, close/cancel behavior, smoke-test hooks, and documentation for follow-up manual validation.

## Fixes Applied

- Disabled the Help panel's full-handbook control when the handbook PDF is not bundled with the app build. This removes a broken visible link.
- Added Escape and outside-click close behavior to the Actions draw popover/dialog.
- Added Escape close behavior to the Draw Choice modal, draw pile inspector, and discard inspector.
- Added stable `data-testid` hooks for key top-bar controls, panels, tableau, minimap, cards, piles, draw dialogs, and inspectors.
- Added automated menu smoke tests that fail if enabled context-menu leaves have no action, link, control, or click handler.

## Existing Controls Confirmed

- File menu actions are wired for local save/load, JSON import/export, Markdown report export, desk PNG export, and Clear.
- PDF report and desk PDF export items are intentionally not shown.
- Undo/Redo disable when unavailable.
- Card context menu orientation/display/size/secret/study/discard controls are wired.
- Draw pile context menu filtered draw entries disable empty subsets or show "No cards available".
- Pile highlighting is mode-aware and covered by existing tests.
- Mode chooser is grouped and expandable, and reused by the New Session wizard.

## Tests Added

- Context-menu no-op audit for card menus.
- Context-menu no-op audit for draw/discard pile menus.
- Existing mode, minimap, Source Review, clear-session, arrow, and card-scale tests remain in place.

Browser e2e tests were not added because Playwright is not currently configured in the workspace. A manual smoke checklist was added instead at `docs/audit/manual-smoke-test.md`.

## Known Remaining Issues

### Developer Panel Visibility

Severity: low

The Developer panel is always visible in the top bar. It is functional, but may be better hidden behind a dev-mode setting in production-like builds.

Likely files: `apps/web/src/ui/layout/MenuBar.tsx`, `apps/web/src/App.tsx`.

### Desk PNG Export Fidelity

Severity: medium

Desk PNG export uses an SVG `foreignObject` clone approach. It is lightweight and dependency-free, but browser support and external image/font capture can vary. A later pass should validate exports against real deck previews and possibly add a dedicated image export library if needed.

Likely file: `apps/web/src/export/exportDeskImage.ts`.

### File Menu Native Details Behavior

Severity: low

File/Edit menus use native `details` elements. They work, but do not yet share the custom outside-click/keyboard behavior of floating panels and context menus.

Likely file: `apps/web/src/ui/layout/MenuBar.tsx`.

### No Browser-Level E2E Harness

Severity: medium

The repo has good reducer/helper tests but no Playwright/Cypress-style app smoke suite. The added test IDs make this straightforward later.

Suggested fix: add Playwright only when dependency installation and CI expectations are clear.

### Developer Diagnostics Are Sparse

Severity: low

The Developer panel has only Copy AI context. It is not a dead control, but diagnostic affordances are limited.

Likely files: `apps/web/src/App.tsx`, `apps/web/src/ui/layout/MenuBar.tsx`.

## Recommended Next Improvements

1. Add Playwright e2e with the new test IDs once dependency policy is settled.
2. Normalize top-level File/Edit menu behavior with outside-click and Escape close.
3. Add small status/toast feedback for Save, Export, Import, and Clear.
4. Add a production/development setting for Developer menu visibility.
5. Validate desk PNG export against high-resolution card previews in a real browser.
