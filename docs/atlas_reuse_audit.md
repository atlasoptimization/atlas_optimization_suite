# Atlas Reuse Audit

Atlas reuses the existing Data Science Deck infrastructure where it fits the optimization workflow:

- `apps/web/src/ui/tableau/Tableau.tsx`: reference implementation for pan/zoom desk behavior, object layers, minimap, and existing card/note composition.
- `apps/web/src/ui/tableau/CardInstanceView.tsx`: reference for pointer-drag card movement and context behavior.
- `apps/web/src/ui/cards/TextCardView.tsx` and `apps/web/src/style.css` `.structured-text-card`: reused visual direction for non-PDF cards. Atlas cards now default to editable text, tags, properties, modules, and diagnostics over a structured grey/green card background.
- `apps/web/src/ui/notes/NoteObjectView.tsx`: reference for sticky-note drag behavior; Atlas living-card note modules use the same lightweight draggable-note idea inside cards.
- `apps/web/src/ui/cards/CardView.tsx`: PDF/card-face display path remains available to the Data Science Deck and is not removed. Atlas does not default to PDF display.
- Domain symbols/background styling in `HiddenCardView`, `domainIcons`, and domain CSS remain available for the Deck; Atlas selectively reuses the subdued structured-card visual language rather than deck PDFs.

Atlas keeps its current `react-zoom-pan-pinch` workbench because it already matches the Data Science Deck canvas dependency and preserves Atlas-specific card/group/query behavior. This avoids rewriting either canvas system.

## Manual Checklist

- Atlas canvas opens from the default app route.
- Atlas cards can be created and moved on the canvas.
- Existing Data Science Deck view opens with `?app=deck` or `#deck`.
- Atlas cards use structured grey/green card backgrounds with editable text/properties/modules on top.
- Drag a property/tag/trait/diagnostic/note module from the module palette onto an Atlas card.
- Move the attached module inside or around the card.
- Edit or delete the module in the inspector.
- Run Evaluate and confirm card diagnostics appear near the right edge.
- Run Solve and confirm solution diagnostics appear where values map to cards.
- Edit the model after solving and confirm solve diagnostics become stale.
- PDF mode in the Data Science Deck still does not crash.
