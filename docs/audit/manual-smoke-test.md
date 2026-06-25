# Manual Smoke Test

Run after major UI changes:

1. Start the app with `pnpm dev`.
2. Confirm the New Session wizard opens on a fresh session.
3. Choose a mode, start the session, and confirm the separate Mode panel does not open automatically.
4. Open Mode manually and select Free, Standard, Source Review, and Abstraction.
5. Click Draw Next for each mode and confirm the highlighted pile matches the recommendation.
6. Right-click a card and verify Orientation, Display, Size slider, Secret, Study, and Move to discard.
7. Open View Settings and toggle minimap, topology, grid, browser, inspector, and pile bar.
8. Use Current cards display presets, then Original.
9. Right-click a domain draw pile and use Inspect pile plus at least one filtered draw action.
10. Open a discard pile and verify Play and Return.
11. Use Actions -> Filtered draw and Choose 1 from N; candidate cards should remain portrait-shaped.
12. Add note and arrow; drag card, note, full arrow, and arrow endpoints.
13. Open File menu and verify local save/load, JSON export/import, Markdown export, desk PNG export, and Clear confirmation.
14. Open Help and verify guide sections switch. The full handbook control should be disabled unless bundled in the build.
15. Press Escape with panels, context menus, pile inspectors, draw choice modal, and Actions popover open.

Automated coverage currently emphasizes reducer/menu geometry and smoke-testable hooks. Browser-level e2e is not configured in this repo yet.
