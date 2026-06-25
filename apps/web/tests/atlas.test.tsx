import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import App, { getInitialAppView } from "../src/App";
import {
  addAtlasCard,
  createAtlasCard,
  deleteAtlasCard,
  moveAtlasCard
} from "../src/atlas/core/cards";
import { atlasReducer } from "../src/atlas/core/reducer";
import type { AtlasWorkbenchState } from "../src/atlas/core/types";
import { AtlasApp } from "../src/atlas/ui/AtlasApp";
import { AtlasCardView } from "../src/atlas/ui/workbench/AtlasCardView";

describe("Atlas app skeleton", () => {
  it("renders the Atlas Optimization Suite layout", () => {
    const html = renderToString(<AtlasApp />);

    expect(html).toContain("Atlas Optimization Suite");
    expect(html).toContain("Evaluate");
    expect(html).toContain("Solve");
    expect(html).toContain("Inspect");
    expect(html).toContain("Export");
    expect(html).toContain("Undo");
    expect(html).toContain("Redo");
    expect(html).toContain("Search");
    expect(html).toContain("Build optimization models from typed cards.");
    expect(html).toContain("Objectives");
    expect(html).toContain("Constraints");
    expect(html).toContain("Inspector");
    expect(html).toContain("Solution");
  });

  it("opens Atlas by default and keeps the deck app routable", () => {
    expect(getInitialAppView({ hash: "", search: "" })).toBe("atlas");
    expect(getInitialAppView({ hash: "", search: "?app=deck" })).toBe("deck");
    expect(getInitialAppView({ hash: "#deck", search: "" })).toBe("deck");
  });

  it("renders the default app entry without crashing", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Atlas Optimization Suite");
  });
});

describe("Atlas card model", () => {
  it("creates all basic Atlas card types", () => {
    const state = ["object", "decision", "data", "function", "constraint", "objective"].reduce(
      (current, cardType) =>
        atlasReducer(current, {
          type: "card.create",
          cardType: cardType as Parameters<typeof createAtlasCard>[0]
        }),
      { cards: [], selectedCardId: null } satisfies AtlasWorkbenchState
    );

    expect(state.cards.map((card) => card.type)).toEqual([
      "object",
      "decision",
      "data",
      "function",
      "constraint",
      "objective"
    ]);
    expect(state.selectedCardId).toBe(state.cards.at(-1)?.id);
  });

  it("moves and deletes cards", () => {
    const withCard = addAtlasCard({ cards: [], selectedCardId: null }, "object", "card-test");
    const moved = moveAtlasCard(withCard, "card-test", { x: 20, y: 30 });
    const deleted = deleteAtlasCard(moved, "card-test");

    expect(moved.cards[0]?.position).toEqual({ x: 20, y: 30 });
    expect(deleted.cards).toHaveLength(0);
    expect(deleted.selectedCardId).toBeNull();
  });

  it("renders an Atlas card component", () => {
    const card = createAtlasCard("function", {
      id: "card-function",
      position: { x: 12, y: 24 }
    });
    const html = renderToString(
      <AtlasCardView
        card={card}
        selected
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(html).toContain("Function");
    expect(html).toContain("data-card-id=\"card-function\"");
    expect(html).toContain("selected");
  });
});
