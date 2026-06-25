import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { CustomCard, DeckCard } from "../src/core/types/card";
import type { CardInstance } from "../src/core/types/session";
import { getFeatureConfig } from "../src/config/features";
import {
  LEGACY_STARTUP_INTRO_STORAGE_KEY,
  STARTUP_INTRO_STORAGE_KEY,
  introHowToStartText,
  introLead,
  introManualText,
  introNoPointsText,
  introStandardText,
  setStartupIntroHidden,
  shouldShowStartupIntro
} from "../src/content/intro";
import { resolveManualPdfUrl } from "../src/assets/manualAsset";
import { guideSections } from "../src/content/guide";
import {
  desktopUiConfig,
  getUiConfig,
  getUiProfileForWidth,
  mobileUiConfig
} from "../src/config/mobileUi";
import { DOMAIN_ORDER } from "../src/core/constants/domains";
import { getCardDisplayPreset } from "../src/core/constants/displayPresets";
import { createSession } from "../src/engine/createSession";
import { gameModes } from "../src/modes/modeRegistry";
import { DEFAULT_MODE_ID } from "../src/modes/constants";
import { groupModesByCategory, MODE_CATEGORIES } from "../src/modes/modeCategories";
import { isDomainMasterCard } from "../src/engine/cards/cardClassification";
import { buildModeRecommendationPrompt } from "../src/export/exportLlmContext";
import {
  buildInterpretationContextJson,
  buildInterpretationContextMarkdown
} from "../src/export/exportInterpretationContext";
import { resolvePublicAssetUrl } from "../src/assets/publicAssetUrl";
import { openPdfAsset } from "../src/assets/openPdfAsset";
import { getNextModeDomain } from "../src/modes/modeDomain";
import {
  getGuidedPileCompletionPatch,
  recordGuidedPileDraw
} from "../src/modes/guidedPileSession";
import { getHighlightedDomainsForRecommendation } from "../src/modes/modeHighlights";
import { getMinimalismRecommendation } from "../src/modes/minimalism";
import { enrichModeRecommendation } from "../src/modes/modeRecommendationMetadata";
import { getSourceReviewPhase } from "../src/modes/sourceReview";
import { shouldOpenModePanelAfterWizard } from "../src/ui/session/newSessionWizardFlow";
import { getCardContextMenuItems } from "../src/ui/context-menu/cardContextMenuItems";
import type { ContextMenuItem } from "../src/ui/context-menu/contextMenuTypes";
import {
  getDiscardPileContextMenuItems,
  getDrawPileContextMenuItems
} from "../src/ui/context-menu/pileContextMenuItems";
import { computeMinimapViewportRect } from "../src/ui/tableau/minimapGeometry";
import {
  getTopologyBackgroundOpacity,
  getTopologyBackgroundPath
} from "../src/ui/tableau/topologyBackgrounds";
import {
  computeTimerDisplay,
  formatDuration
} from "../src/ui/timer/timerUtils";
import { buildExampleSession } from "../src/demo/exampleSession";
import {
  BUSINESS_STRATEGY_SCRIPT_ID,
  linearCalibrationScript,
  resolveScriptCard,
  scriptedSessions
} from "../src/demo/scriptedSessions";
import {
  getDefaultScriptedPlacementForCard,
  isPointInsideScriptedDomain
} from "../src/demo/scriptedPlacement";
import { scriptedDemoMode } from "../src/modes/scriptedDemo";
import { getInspectorAssetSources } from "../src/ui/inspector/inspectorAssets";
import {
  getCardBackImage,
  getCardBackPreviewCandidates,
  getCardBackThumbnail,
  getCardBackPreview,
  getCardArtImage,
  getCardFrontImage,
  getCardFrontPreviewCandidates,
  getCardFrontThumbnail,
  getCardFrontPreview,
  getCardPdfUrl
} from "../src/ui/cards/cardAssetResolution";
import {
  advanceDrawCycle,
  createDomainPiles,
  drawFromPile,
  getNextDomain
} from "../src/engine/piles";
import { sessionReducer } from "../src/engine/sessionReducer";
import { getCardsById } from "../src/engine/selectors";
import { createSessionExportJson } from "../src/storage/exportSessionJson";
import { parseSessionJson } from "../src/storage/importSessionJson";
import { loadLocalSession } from "../src/storage/localSessionStorage";
import {
  loadCustomCards,
  normalizeCustomCard,
  saveCustomCards
} from "../src/storage/localCustomCardsStorage";
import {
  clampOverlayScale,
  loadViewSettings,
  normalizeOverlayPosition,
  saveViewSettings
} from "../src/storage/localViewSettingsStorage";
import { getActiveEffect } from "../src/ui/cards/cardText";
import { getTextCardContent } from "../src/ui/cards/TextCardView";
import { searchCards } from "../src/ui/search/CardSearchPalette";
import {
  buildCustomDrawCandidateRefs,
  makeTwoEachCanonicalRecipe
} from "../src/ui/draw/CustomDrawDialog";
import { customCardsToCsv } from "../src/customCards/exportCustomCardsCsv";
import { parseCustomCardsCsv } from "../src/customCards/importCustomCardsCsv";
import {
  createCustomCardsExportJson,
  parseCustomCardsJson
} from "../src/customCards/customCardsJson";
import {
  getAllDomainNames,
  getCustomDomainCards,
  parseCustomDomainSpecJson
} from "../src/customDomains/customDomainSpec";
import {
  getActiveCustomDomainCards,
  getActiveDomainNames,
  getDiscoveredCustomDomains
} from "../src/customDomains/discoveredCustomDomains";
import {
  getCustomDomainsFolderPath,
  getCustomDomainsSyncCommand
} from "../src/customDomains/customDomainInstructions";
import {
  DEFAULT_CUSTOM_DOMAIN_SETTINGS,
  loadCustomDomainSettings,
  saveCustomDomainSettings
} from "../src/storage/localCustomDomainSettingsStorage";
import {
  parseDomainMetadataFile,
  scanCustomDomainCards
} from "../../../packages/deck-assets/src/customDomains";
import { classifyTopologyBackground } from "../../../packages/deck-assets/src/buildManifest";
import { findBestAsset, resolveCsvArtAsset } from "../../../packages/deck-assets/src/assetMatching";
import { loadDeploymentProfile } from "../../../scripts/lib/profile-config";
import { auditReleasePaths } from "../../../scripts/lib/release-path-audit";
import {
  auditManifestAssets,
  localPathForPublicAsset
} from "../../../scripts/lib/manifest-asset-audit.mjs";
import { auditPublicBuildAssets } from "../../../scripts/lib/public-build-asset-audit.mjs";
import { smokeAssetUrls } from "../../../scripts/lib/asset-url-smoke.mjs";
import { getTrackedPublicAssetFindings } from "../../../scripts/lib/public-assets-tracked.mjs";
import {
  ACTIVE_BOARD_BOUNDS,
  DRAWING_ZONE_BOUNDS,
  MODEL_CORE_BOUNDS,
  SOURCE_BOUNDS,
  STANDARD_VIEW_BOOKMARKS,
  TABLEAU_DEFAULT_VIEW_BOUNDS,
  TABLEAU_HEIGHT,
  TABLEAU_WIDTH,
  VOLITION_BOUNDS,
  boundsInsideTableau,
  computeCardBounds,
  computeObjectBounds,
  computeViewTransformForBounds
} from "../src/core/constants/tableau";

function testCard(id: string, domain: string, cardname = id, subdomain = ""): DeckCard {
  return {
    id,
    cardname,
    domain,
    subdomain,
    summary: "",
    twin: "",
    keywords: [],
    question: "",
    story: "",
    effectGood: "",
    effectBad: "",
    effectMod: "",
    imagePath: null,
    pdfPath: null,
    raw: {}
  };
}

function makeMinimalismCards(): DeckCard[] {
  return DOMAIN_ORDER.flatMap((domain) => {
    const key = domain.toLowerCase();
    const subdomain = domain === "Source"
      ? "Observation"
      : domain === "Structure"
        ? "Assumption"
        : `${domain} Layer`;

    return [
      testCard(`${key}-master`, domain, `The ${domain}`),
      testCard(`${key}-${subdomain.toLowerCase().replace(/\s+/g, "-")}`, domain, subdomain, subdomain),
      testCard(`${key}-ordinary`, domain, `Ordinary ${domain}`, subdomain)
    ];
  });
}

function customCard(id: CustomCard["id"] = "custom:test-card"): CustomCard {
  return {
    id,
    origin: "custom",
    cardname: "My Custom Hypothesis",
    domain: "Custom",
    subdomain: "Local idea",
    summary: "A locally authored modelling idea.",
    twin: "User-defined variable",
    keywords: ["custom", "hypothesis"],
    question: "What does this local hypothesis explain?",
    story: "A user-created card for this session.",
    effectGood: "Treat this as a productive local assumption.",
    effectBad: "Treat this as a problematic local assumption.",
    effectMod: "Use this as a modifier on another card.",
    frontImage: null,
    backImage: null,
    imagePath: null,
    pdfPath: null,
    raw: {},
    isCustom: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function placedCard(): CardInstance {
  const state = sessionReducer(createSession(), {
    type: "card.place",
    cardId: "source-a"
  });

  return state.tableau[0];
}

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  });
}

function findEnabledNoopMenuItems(items: ContextMenuItem[], path: string[] = []): string[] {
  return items.flatMap((item) => {
    const itemPath = [...path, item.id];
    const enabled = item.enabled ?? true;
    if (!enabled) return [];
    if (item.children?.length) return findEnabledNoopMenuItems(item.children, itemPath);
    if (item.control || item.action || item.onClick || item.href) return [];
    return [itemPath.join(" > ")];
  });
}

describe("sessionReducer", () => {
  it("places a card", () => {
    const state = sessionReducer(createSession(), {
      type: "card.place",
      cardId: "source-a",
      x: 10,
      y: 20
    });

    expect(state.tableau).toHaveLength(1);
    expect(state.tableau[0]).toMatchObject({
      cardId: "source-a",
      x: 10,
      y: 20,
      rotation: 0,
      orientation: "upright",
      displayMode: "card-face-and-active-effect",
      face: "both",
      scale: 1,
      ablated: false
    });
    expect(state.selectedInstanceId).toBe(state.tableau[0].instanceId);
  });

  it("places a specific scripted card and removes it from its pile", () => {
    const source = testCard("source-master", "Source", "The Source");
    const initial = {
      ...createSession(),
      piles: createDomainPiles([source])
    };
    const state = sessionReducer(initial, {
      type: "script.placeSpecificCard",
      cardId: source.id,
      domain: "Source",
      x: 120,
      y: 240,
      orientation: "upright",
      commentary: "Script placed Source"
    });

    expect(state.tableau).toHaveLength(1);
    expect(state.tableau[0]).toMatchObject({
      cardId: source.id,
      x: 120,
      y: 240,
      orientation: "upright"
    });
    expect(state.piles[0].currentOrder).not.toContain(source.id);
    expect(state.piles[0].drawnCardIds).toContain(source.id);
    expect(state.log.some((entry) => entry.actionType === "script.placeSpecificCard")).toBe(true);
  });

  it("moves a card", () => {
    const card = placedCard();
    const state = sessionReducer(
      { ...createSession(), tableau: [card] },
      {
        type: "card.move",
        instanceId: card.instanceId,
        dx: 5,
        dy: -3
      }
    );

    expect(state.tableau[0].x).toBe(card.x + 5);
    expect(state.tableau[0].y).toBe(card.y - 3);
  });

  it("rotates a card", () => {
    const card = placedCard();
    const state = sessionReducer(
      { ...createSession(), tableau: [card] },
      {
        type: "card.rotate",
        instanceId: card.instanceId
      }
    );

    expect(state.tableau[0].rotation).toBe(90);
  });

  it("sets orientation", () => {
    const card = placedCard();
    const state = sessionReducer(
      { ...createSession(), tableau: [card] },
      {
        type: "card.setOrientation",
        instanceId: card.instanceId,
        orientation: "reversed"
      }
    );

    expect(state.tableau[0].orientation).toBe("reversed");
  });

  it("cycles orientation through four states", () => {
    const card = placedCard();
    let state = { ...createSession(), tableau: [card] };

    state = sessionReducer(state, {
      type: "card.cycleOrientation",
      instanceId: card.instanceId
    });
    expect(state.tableau[0].orientation).toBe("reversed");

    state = sessionReducer(state, {
      type: "card.cycleOrientation",
      instanceId: card.instanceId
    });
    expect(state.tableau[0].orientation).toBe("modifier");

    state = sessionReducer(state, {
      type: "card.cycleOrientation",
      instanceId: card.instanceId
    });
    expect(state.tableau[0].orientation).toBe("question");

    state = sessionReducer(state, {
      type: "card.cycleOrientation",
      instanceId: card.instanceId
    });
    expect(state.tableau[0].orientation).toBe("upright");
  });

  it("drawn Aspect cards default to modifier orientation", () => {
    const cards = [testCard("aspect-a", "Aspect")];
    const state = sessionReducer(
      { ...createSession(), piles: createDomainPiles(cards) },
      {
        type: "piles.drawDomain",
        domain: "Aspect"
      }
    );

    expect(state.tableau[0].orientation).toBe("modifier");
  });

  it("hidden non-Aspect draws assign an internal orientation before reveal", () => {
    const cards = [testCard("source-a", "Source")];
    const state = sessionReducer(
      { ...createSession(), piles: createDomainPiles(cards) },
      {
        type: "piles.drawDomain",
        domain: "Source",
        hidden: true
      }
    );

    expect(["upright", "reversed", "modifier", "question"]).toContain(state.tableau[0].orientation);
    expect(state.tableau[0].hidden).toBe(true);
  });

  it("sets display mode", () => {
    const card = placedCard();
    const state = sessionReducer(
      { ...createSession(), tableau: [card] },
      {
        type: "card.setDisplayMode",
        instanceId: card.instanceId,
        displayMode: "question"
      }
    );

    expect(state.tableau[0].displayMode).toBe("question");
  });

  it("deletes a card instance", () => {
    const card = placedCard();
    const state = sessionReducer(
      {
        ...createSession(),
        tableau: [card],
        selectedInstanceId: card.instanceId
      },
      {
        type: "card.deleteInstance",
        instanceId: card.instanceId
      }
    );

    expect(state.tableau).toHaveLength(0);
    expect(state.selectedInstanceId).toBeNull();
  });

  it("sets independent card scales and clamps them", () => {
    const first = placedCard();
    const second = { ...placedCard(), instanceId: "second", cardId: "source-b" };
    let state = { ...createSession(), tableau: [first, second] };

    state = sessionReducer(state, {
      type: "card.setScale",
      instanceId: first.instanceId,
      scale: 1.5
    });
    expect(state.tableau.find((card) => card.instanceId === first.instanceId)?.scale).toBe(1.5);
    expect(state.tableau.find((card) => card.instanceId === second.instanceId)?.scale).toBe(1);

    state = sessionReducer(state, {
      type: "card.setScale",
      instanceId: first.instanceId,
      scale: 99
    });
    expect(state.tableau.find((card) => card.instanceId === first.instanceId)?.scale).toBe(3);

    state = sessionReducer(state, {
      type: "card.setScale",
      instanceId: first.instanceId,
      scale: 0.1
    });
    expect(state.tableau.find((card) => card.instanceId === first.instanceId)?.scale).toBe(0.4);
  });

  it("uses action scale only for newly placed cards", () => {
    const existing = placedCard();
    const state = sessionReducer(
      { ...createSession(), tableau: [existing] },
      {
        type: "card.place",
        cardId: "source-b",
        scale: 1.3
      }
    );

    expect(state.tableau.find((card) => card.instanceId === existing.instanceId)?.scale).toBe(1);
    expect(state.tableau.find((card) => card.cardId === "source-b")?.scale).toBe(1.3);
  });

  it("scales all current cards without changing notes or arrows", () => {
    const first = { ...placedCard(), scale: 1 };
    const second = { ...placedCard(), instanceId: "second", cardId: "source-b", scale: 2, hidden: true };
    const note = {
      id: "note-1",
      type: "note" as const,
      x: 10,
      y: 20,
      text: "Keep note size",
      noteKind: "free" as const
    };
    const arrow = {
      id: "arrow-1",
      type: "arrow" as const,
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
      label: "",
      strokeWidth: 4
    };
    let state = {
      ...createSession(),
      tableau: [first, second],
      notes: [note],
      arrows: [arrow]
    };

    state = sessionReducer(state, { type: "card.scaleAll", factor: 1.5 });
    expect(state.tableau.map((card) => card.scale)).toEqual([1.5, 3]);
    expect(state.notes[0]).toMatchObject({ x: 10, y: 20 });
    expect(state.arrows[0]).toMatchObject({ x1: 1, y1: 2, x2: 3, y2: 4 });

    state = sessionReducer(state, { type: "card.setAllScales", scale: 0.5 });
    expect(state.tableau.map((card) => card.scale)).toEqual([0.5, 0.5]);

    state = sessionReducer(state, { type: "card.resetAllScales" });
    expect(state.tableau.map((card) => card.scale)).toEqual([1, 1]);
  });

  it("toggles ablated state independently", () => {
    const first = placedCard();
    const second = { ...placedCard(), instanceId: "second", cardId: "source-b" };
    let state = { ...createSession(), tableau: [first, second] };

    state = sessionReducer(state, {
      type: "card.toggleAblated",
      instanceId: first.instanceId
    });

    expect(state.tableau.find((card) => card.instanceId === first.instanceId)?.ablated).toBe(true);
    expect(state.tableau.find((card) => card.instanceId === second.instanceId)?.ablated).toBe(false);

    state = sessionReducer(state, {
      type: "card.toggleAblated",
      instanceId: first.instanceId
    });

    expect(state.tableau.find((card) => card.instanceId === first.instanceId)?.ablated).toBe(false);
  });

  it("reveals all hidden cards without changing revealed cards", () => {
    const first = { ...placedCard(), hidden: true };
    const second = { ...placedCard(), instanceId: "second", cardId: "source-b", hidden: false };
    const third = { ...placedCard(), instanceId: "third", cardId: "source-c", hidden: true };
    const state = sessionReducer(
      { ...createSession(), tableau: [first, second, third] },
      { type: "card.revealAll" }
    );

    expect(state.tableau.map((card) => card.hidden)).toEqual([false, false, false]);
    expect(state.log.at(-1)?.actionType).toBe("card.revealAll");
  });

  it("updates mode progress without replacing other mode progress", () => {
    const state = sessionReducer(
      {
        ...createSession(),
        modeProgress: {
          "other-mode": { step: 2 },
          "own-worst-enemy": { step: 1, stance: "anti" }
        }
      },
      {
        type: "mode.updateProgress",
        modeId: "own-worst-enemy",
        patch: { step: 2, stance: "pro" }
      }
    );

    expect(state.modeProgress).toMatchObject({
      "other-mode": { step: 2 },
      "own-worst-enemy": { step: 2, stance: "pro" }
    });
  });

  it("clears board objects and session log", () => {
    const card = placedCard();
    const state = sessionReducer(
      {
        ...createSession(),
        timer: {
          ...createSession().timer,
          visible: true,
          mode: "countdown",
          status: "running",
          startedAt: "2026-01-01T00:00:00.000Z",
          accumulatedMs: 1000,
          actionOnFinish: "next"
        },
        tableau: [card],
        notes: [{
          id: "note-1",
          type: "note",
          x: 1,
          y: 2,
          text: "note",
          noteKind: "free"
        }],
        arrows: [{
          id: "arrow-1",
          type: "arrow",
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
          label: "",
          strokeWidth: 4
        }],
        log: [{
          id: "log-1",
          timestamp: "2026-01-01T00:00:00.000Z",
          actionType: "test",
          label: "Test"
        }],
        selectedInstanceId: card.instanceId,
        selectedNoteId: "note-1",
        selectedArrowId: "arrow-1"
      },
      { type: "session.clear" }
    );

    expect(state.tableau).toEqual([]);
    expect(state.notes).toEqual([]);
    expect(state.arrows).toEqual([]);
    expect(state.log).toEqual([]);
    expect(state.selectedInstanceId).toBeNull();
    expect(state.selectedNoteId).toBeNull();
    expect(state.selectedArrowId).toBeNull();
    expect(state.timer).toMatchObject({
      visible: false,
      mode: "stopwatch",
      status: "idle",
      accumulatedMs: 0,
      actionOnFinish: "none"
    });
  });

  it("starts, pauses, and finishes timers", () => {
    const started = sessionReducer(createSession(), {
      type: "timer.start",
      now: "2026-01-01T00:00:00.000Z"
    });

    expect(started.timer).toMatchObject({
      status: "running",
      startedAt: "2026-01-01T00:00:00.000Z",
      accumulatedMs: 0
    });

    const paused = sessionReducer(started, {
      type: "timer.pause",
      now: "2026-01-01T00:00:30.000Z"
    });

    expect(paused.timer).toMatchObject({
      status: "paused",
      accumulatedMs: 30000
    });

    const finished = sessionReducer(paused, {
      type: "timer.finish",
      now: "2026-01-01T00:02:00.000Z"
    });

    expect(finished.timer.status).toBe("finished");
    expect(finished.timer.lastFinishedAt).toBe("2026-01-01T00:02:00.000Z");
    expect(finished.log[finished.log.length - 1]?.actionType).toBe("timer.finish");
  });

  it("moves an entire arrow by translating both endpoints", () => {
    const state = sessionReducer(
      {
        ...createSession(),
        arrows: [{
          id: "arrow-1",
          type: "arrow",
          x1: 10,
          y1: 20,
          x2: 110,
          y2: 120,
          label: "",
          strokeWidth: 4
        }]
      },
      {
        type: "arrow.move",
        arrowId: "arrow-1",
        dx: 5,
        dy: -8
      }
    );

    expect(state.arrows[0]).toMatchObject({
      x1: 15,
      y1: 12,
      x2: 115,
      y2: 112
    });
  });

  it("moves only the selected arrow endpoint", () => {
    const state = sessionReducer(
      {
        ...createSession(),
        arrows: [{
          id: "arrow-1",
          type: "arrow",
          x1: 10,
          y1: 20,
          x2: 110,
          y2: 120,
          label: "",
          strokeWidth: 4
        }]
      },
      {
        type: "arrow.moveEndpoint",
        arrowId: "arrow-1",
        endpoint: "end",
        dx: -15,
        dy: 25
      }
    );

    expect(state.arrows[0]).toMatchObject({
      x1: 10,
      y1: 20,
      x2: 95,
      y2: 145
    });
  });

  it("deletes selected arrows", () => {
    const state = sessionReducer(
      {
        ...createSession(),
        selectedArrowId: "arrow-1",
        arrows: [{
          id: "arrow-1",
          type: "arrow",
          x1: 10,
          y1: 20,
          x2: 110,
          y2: 120,
          label: "",
          strokeWidth: 4
        }]
      },
      {
        type: "arrow.delete",
        arrowId: "arrow-1"
      }
    );

    expect(state.arrows).toEqual([]);
    expect(state.selectedArrowId).toBeNull();
  });
});

describe("piles", () => {
  it("creates domain piles grouped by domain", () => {
    const piles = createDomainPiles([
      testCard("source-a", "Source"),
      testCard("source-b", "Source"),
      testCard("void-a", "Void")
    ]);

    expect(piles.find((pile) => pile.domain === "Source")?.cardIds).toEqual([
      "source-a",
      "source-b"
    ]);
    expect(piles.find((pile) => pile.domain === "Void")?.cardIds).toEqual(["void-a"]);
  });

  it("drawFromPile removes from currentOrder and records drawn card", () => {
    const pile = {
      id: "domain-source",
      name: "Source",
      domain: "Source",
      cardIds: ["source-a", "source-b"],
      currentOrder: ["source-a", "source-b"],
      drawnCardIds: [],
      discardCardIds: []
    };

    const result = drawFromPile(pile);

    expect(result.cardId).toBe("source-a");
    expect(result.pile.currentOrder).toEqual(["source-b"]);
    expect(result.pile.drawnCardIds).toEqual(["source-a"]);
  });

  it("advances draw cycle through the domain order", () => {
    let cycle = {
      order: [...DOMAIN_ORDER],
      index: 0
    };

    const seen: string[] = [];
    for (let index = 0; index < DOMAIN_ORDER.length + 1; index += 1) {
      seen.push(getNextDomain(cycle));
      cycle = advanceDrawCycle(cycle);
    }

    expect(seen).toEqual([
      "Source",
      "Structure",
      "Chameleon",
      "Void",
      "Volition",
      "Aspect",
      "Source"
    ]);
  });
});

describe("local session migration", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it("adds missing orientation and displayMode to old saved cards", () => {
    localStorage.setItem(
      "dsd.session",
      JSON.stringify([
        {
          instanceId: "old-1",
          cardId: "source-a",
          x: 1,
          y: 2,
          rotation: 0
        }
      ])
    );

    const saved = loadLocalSession();

    expect(saved.tableau[0]).toMatchObject({
      instanceId: "old-1",
      cardId: "source-a",
      orientation: "upright",
      displayMode: "full-card-image",
      scale: 1,
      ablated: false
    });
  });

  it("migrates legacy counter-reading notes to problem notes", () => {
    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: [
          {
            id: "note-legacy",
            type: "note",
            x: 0,
            y: 0,
            text: "legacy",
            noteKind: "counter-reading"
          }
        ]
      })
    );

    const saved = loadLocalSession();

    expect(saved.notes[0]?.noteKind).toBe("problem");
  });

  it("migrates old sessions without custom cards to an empty custom card library", () => {
    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: []
      })
    );

    const saved = loadLocalSession();

    expect(saved.customCards).toEqual([]);
  });

  it("migrates removed Reverse Auction sessions to Standard", () => {
    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: [],
        activeModeId: "reverse-auction"
      })
    );

    expect(loadLocalSession().activeModeId).toBe("standard");
  });

  it("defaults local sessions without a mode to Standard and preserves explicit Minimalism", () => {
    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: []
      })
    );

    expect(loadLocalSession().activeModeId).toBe(DEFAULT_MODE_ID);

    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: [],
        activeModeId: "minimalism"
      })
    );

    expect(loadLocalSession().activeModeId).toBe("minimalism");
  });

  it("loads custom cards from saved local sessions", () => {
    const card = customCard();
    localStorage.setItem(
      "dsd.session",
      JSON.stringify({
        tableau: [],
        notes: [],
        customCards: [card]
      })
    );

    const saved = loadLocalSession();

    expect(saved.customCards).toHaveLength(1);
    expect(saved.customCards?.[0]).toMatchObject({
      id: card.id,
      origin: "custom",
      isCustom: true,
      cardname: card.cardname
    });
  });
});

describe("feature profiles", () => {
  it("loads deployment profile files for public demo and local full", () => {
    const publicProfile = loadDeploymentProfile("public-demo");
    const localProfile = loadDeploymentProfile("local-full");

    expect(publicProfile.features.enableCustomAssets).toBe(false);
    expect(publicProfile.features.enableDeveloperPanel).toBe(false);
    expect(publicProfile.assets.includeCustomDomains).toBe(false);
    expect(localProfile.features.enableCustomAssets).toBe(true);
    expect(localProfile.features.enableDeveloperPanel).toBe(true);
    expect(localProfile.assets.includeCustomDomains).toBe(true);
  });

  it("public-demo disables local-only custom assets and local save/load", () => {
    const config = getFeatureConfig("public-demo", "https://example.test/repo");

    expect(config.enableLocalSaveLoad).toBe(false);
    expect(config.enableCustomAssets).toBe(false);
    expect(config.enableCustomCards).toBe(false);
    expect(config.enableCustomDomains).toBe(false);
    expect(config.githubUrl).toBe("https://example.test/repo");
  });

  it("local-full enables full local features", () => {
    const config = getFeatureConfig("local-full");

    expect(config.enableLocalSaveLoad).toBe(true);
    expect(config.enableCustomAssets).toBe(true);
    expect(config.enableCustomCards).toBe(true);
    expect(config.enableCustomDomains).toBe(true);
    expect(config.enableDeveloperPanel).toBe(true);
  });

  it("public-demo keeps JSON import/export and Ask AI context export available", () => {
    const config = getFeatureConfig("public-demo");

    expect(config.enableSessionJsonImportExport).toBe(true);
    expect(config.enableAskAiContextExport).toBe(true);
  });

  it("uses visible disabled controls instead of clickable no-op local save/load", () => {
    const menuSource = fs.readFileSync(path.resolve("apps/web/src/ui/layout/MenuBar.tsx"), "utf8");

    expect(menuSource).toContain("FeatureMenuButton");
    expect(menuSource).toContain("disabled={!enabled}");
    expect(menuSource).toContain("features.disabledFeatureMessage");
  });

  it("custom assets section is guarded by feature config", () => {
    const browserSource = fs.readFileSync(path.resolve("apps/web/src/ui/browser/CardBrowser.tsx"), "utf8");

    expect(browserSource).toContain("features.enableCustomAssets");
    expect(browserSource).toContain("features.enableCustomCards");
    expect(browserSource).toContain("features.enableCustomDomains");
  });

  it("disabled custom asset messaging points users to the local version", () => {
    const settingsSource = fs.readFileSync(path.resolve("apps/web/src/ui/settings/ViewSettingsPanel.tsx"), "utf8");
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(settingsSource).toContain("features.disabledFeatureMessage");
    expect(settingsSource).toContain("features.releaseUrl");
    expect(appSource).toContain("featureConfig.releaseUrl");
  });

  it("profile base paths define public and local-release build targets", () => {
    expect(loadDeploymentProfile("public-demo").basePath).toBe("/data-science-deck-app/");
    expect(loadDeploymentProfile("local-release").basePath).toBe("./");
  });
});

describe("release path audit", () => {
  it("catches private paths in runtime files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-audit-"));
    const file = path.join(dir, "manifest.json");
    fs.writeFileSync(file, JSON.stringify({ source: "/home/jemil/Desktop/Card_game_full/file.pdf" }), "utf8");

    const findings = auditReleasePaths({
      roots: [dir],
      forbiddenPatterns: ["/home/", "/Desktop/", "Card_game_full"]
    });

    expect(findings.map((finding) => finding.pattern)).toEqual([
      "/home/",
      "/Desktop/",
      "Card_game_full"
    ]);
  });

  it("keeps generated deck manifest browser-safe when present", () => {
    const manifestPath = path.resolve("apps/web/public/deck/manifest.json");
    if (!fs.existsSync(manifestPath)) return;

    expect(auditReleasePaths({
      roots: [manifestPath],
      forbiddenPatterns: ["/home/", "/Desktop/", "file://", "Card_game_full", "Scribus_setup", "/mnt/data/"]
    })).toEqual([]);
  });
});

describe("manifest asset audit", () => {
  it("normalizes GitHub Pages deck paths to local public files", () => {
    expect(localPathForPublicAsset("/data_science_deck/deck/images/a.webp", "/tmp/public")).toBe(
      path.join("/tmp/public", "deck/images/a.webp")
    );
    expect(localPathForPublicAsset("/deck/images/a.webp", "/tmp/public")).toBe(
      path.join("/tmp/public", "deck/images/a.webp")
    );
    expect(localPathForPublicAsset("deck/images/a.webp", "/tmp/public")).toBe(
      path.join("/tmp/public", "deck/images/a.webp")
    );
  });

  it("passes matching WebP preview assets and fails missing image references", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-manifest-assets-"));
    const publicRoot = path.join(dir, "public");
    const deckRoot = path.join(publicRoot, "deck");
    fs.mkdirSync(path.join(deckRoot, "images"), { recursive: true });
    fs.mkdirSync(path.join(deckRoot, "pdf-previews", "reading"), { recursive: true });
    fs.writeFileSync(path.join(deckRoot, "images", "Gambler.webp"), "webp");
    fs.writeFileSync(path.join(deckRoot, "pdf-previews", "reading", "Gambler_front.webp"), "webp");

    const manifestPath = path.join(deckRoot, "manifest.json");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        cards: [
          {
            imagePath: "deck/images/Gambler.webp",
            frontReadingImage: "/data_science_deck/deck/pdf-previews/reading/Gambler_front.webp",
            backReadingImage: "deck/pdf-previews/reading/Gambler_back.webp",
            pdfPath: "deck/pdfs/Gambler.pdf"
          }
        ]
      }),
      "utf8"
    );

    const result = auditManifestAssets({ manifestPath, publicRoot });

    expect(result.missing.map((entry: { value: string }) => entry.value)).toEqual([
      "deck/pdf-previews/reading/Gambler_back.webp"
    ]);
    expect(result.warnings.map((entry: { value: string }) => entry.value)).toEqual([
      "deck/pdfs/Gambler.pdf"
    ]);
    fs.writeFileSync(path.join(deckRoot, "pdf-previews", "reading", "Gambler_back.webp"), "webp");
    expect(auditManifestAssets({ manifestPath, publicRoot }).missing).toEqual([]);
  });
});

describe("public build asset audit", () => {
  it("fails when a dist asset referenced by the public manifest is missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-public-build-assets-"));
    const publicRoot = path.join(dir, "public");
    const distRoot = path.join(dir, "dist");
    const publicDeck = path.join(publicRoot, "deck");
    const distDeck = path.join(distRoot, "deck");
    fs.mkdirSync(path.join(publicDeck, "pdf-previews", "reading", "aspect"), { recursive: true });
    fs.mkdirSync(distDeck, { recursive: true });
    fs.writeFileSync(
      path.join(publicDeck, "pdf-previews", "reading", "aspect", "the-aspect_front_reading.png"),
      "png"
    );
    fs.writeFileSync(
      path.join(publicDeck, "manifest.json"),
      JSON.stringify({
        cards: [
          {
            domain: "Aspect",
            cardname: "The Aspect",
            frontImage: "deck/pdf-previews/reading/aspect/the-aspect_front_reading.png"
          }
        ]
      }),
      "utf8"
    );
    fs.writeFileSync(path.join(distDeck, "manifest.json"), "{}");

    const findings = auditPublicBuildAssets({
      publicManifestPath: path.join(publicDeck, "manifest.json"),
      distManifestPath: path.join(distDeck, "manifest.json"),
      publicRoot,
      distRoot
    });

    expect(findings).toEqual([
      expect.objectContaining({
        cardDomain: "Aspect",
        cardName: "The Aspect",
        field: "frontImage",
        missingPublic: false,
        missingDist: true
      })
    ]);
  });

  it("smoke-tests representative built asset URLs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-asset-url-smoke-"));
    const distRoot = path.join(dir, "dist");
    const distDeck = path.join(distRoot, "deck");
    fs.mkdirSync(path.join(distDeck, "pdf-previews", "reading", "aspect"), { recursive: true });
    fs.mkdirSync(path.join(distDeck, "pdfs", "aspect"), { recursive: true });
    fs.mkdirSync(path.join(distDeck, "images", "aspect"), { recursive: true });
    fs.writeFileSync(
      path.join(distDeck, "pdf-previews", "reading", "aspect", "the-aspect_front_reading.png"),
      "png"
    );
    fs.writeFileSync(
      path.join(distDeck, "pdf-previews", "reading", "aspect", "the-aspect_back_reading.png"),
      "png"
    );
    fs.writeFileSync(path.join(distDeck, "pdfs", "aspect", "the-aspect.pdf"), "pdf");
    fs.writeFileSync(path.join(distDeck, "images", "aspect", "the-aspect.webp"), "webp");
    fs.writeFileSync(
      path.join(distDeck, "manifest.json"),
      JSON.stringify({
        cards: [
          {
            id: "aspect-the-aspect",
            domain: "Aspect",
            cardname: "The Aspect",
            frontImage: "deck/pdf-previews/reading/aspect/the-aspect_front_reading.png",
            backImage: "deck/pdf-previews/reading/aspect/the-aspect_back_reading.png",
            pdfPath: "deck/pdfs/aspect/the-aspect.pdf",
            imagePath: "deck/images/aspect/the-aspect.webp"
          }
        ]
      }),
      "utf8"
    );

    expect(smokeAssetUrls({
      distManifestPath: path.join(distDeck, "manifest.json"),
      distRoot
    }).missing).toEqual([]);

    fs.unlinkSync(path.join(distDeck, "pdf-previews", "reading", "aspect", "the-aspect_back_reading.png"));
    expect(smokeAssetUrls({
      distManifestPath: path.join(distDeck, "manifest.json"),
      distRoot
    }).missing).toEqual([
      expect.objectContaining({ field: "backImage" })
    ]);
  });

  it("warns when public deck manifest or sampled assets are not tracked", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-tracked-assets-"));
    const publicRoot = path.join(dir, "public");
    const manifestPath = path.join(publicRoot, "deck", "manifest.json");
    const assetPath = path.join(publicRoot, "deck", "images", "aspect", "the-aspect.webp");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        cards: [{ imagePath: "deck/images/aspect/the-aspect.webp" }]
      }),
      "utf8"
    );
    fs.mkdirSync(path.dirname(assetPath), { recursive: true });
    fs.writeFileSync(assetPath, "webp");

    const findings = getTrackedPublicAssetFindings({
      manifestPath,
      publicRoot,
      trackedFiles: []
    });

    expect(findings).toEqual([
      expect.objectContaining({ path: manifestPath, reason: "manifest is not tracked" }),
      expect.objectContaining({ path: assetPath, reason: "asset exists locally but is not tracked" })
    ]);
  });
});

describe("custom cards", () => {
  it("normalizes custom cards with custom colon and legacy dash ids", () => {
    expect(normalizeCustomCard(customCard("custom:colon"))?.id).toBe("custom:colon");
    expect(normalizeCustomCard({ ...customCard("custom:colon"), id: "custom-legacy" })?.id).toBe(
      "custom-legacy"
    );
  });

  it("includes custom cards in cardsById lookups", () => {
    const deckCard = testCard("source-a", "Source");
    const localCard = customCard();
    const cardsById = getCardsById([deckCard, localCard]);

    expect(cardsById.get(localCard.id)?.cardname).toBe("My Custom Hypothesis");
  });

  it("can place a custom card instance", () => {
    const state = sessionReducer(createSession(), {
      type: "card.place",
      cardId: customCard().id,
      displayMode: "text-card"
    });

    expect(state.tableau[0]).toMatchObject({
      cardId: "custom:test-card",
      displayMode: "text-card",
      orientation: "upright"
    });
  });

  it("preserves custom cards through session JSON export and import", () => {
    const session = {
      ...createSession(),
      customCards: [customCard()]
    };
    const parsed = parseSessionJson(createSessionExportJson(session));

    expect(parsed.session.customCards).toHaveLength(1);
    expect(parsed.session.customCards[0]).toMatchObject({
      id: "custom:test-card",
      origin: "custom",
      isCustom: true
    });
  });

  it("migrates imported Reverse Auction sessions to Standard", () => {
    const parsed = parseSessionJson(createSessionExportJson({
      ...createSession(),
      activeModeId: "reverse-auction"
    }));

    expect(parsed.session.activeModeId).toBe("standard");
  });

  it("defaults imported sessions without a mode to Standard and preserves explicit Minimalism", () => {
    const withoutMode = JSON.parse(createSessionExportJson(createSession()));
    delete (withoutMode.session as { activeModeId?: string }).activeModeId;

    expect(parseSessionJson(JSON.stringify(withoutMode)).session.activeModeId).toBe(DEFAULT_MODE_ID);

    const minimalism = parseSessionJson(createSessionExportJson({
      ...createSession(),
      activeModeId: "minimalism"
    }));

    expect(minimalism.session.activeModeId).toBe("minimalism");
  });

  it("finds custom cards through search", () => {
    const results = searchCards([testCard("source-a", "Source"), customCard()], "hypothesis");

    expect(results[0]?.card.id).toBe("custom:test-card");
  });

  it("resolves custom card active effects for all orientations", () => {
    const card = customCard();

    expect(getActiveEffect(card, "upright")).toContain("productive");
    expect(getActiveEffect(card, "reversed")).toContain("problematic");
    expect(getActiveEffect(card, "modifier")).toContain("modifier");
    expect(getActiveEffect(card, "question")).toContain("local hypothesis");
  });

  it("uses the short Aspect modifier text for Aspect active effects", () => {
    const card = testCard("aspect-a", "Aspect");
    card.effectGood = "Long virtue";
    card.effectBad = "Long pathology";
    card.effectMod = "Long modifier";

    expect(getActiveEffect(card, "upright")).toBe(
      "Aspect cards modify what aspect of a target y is investigated. Choose a keyword x and interpret x(y), the aspect x of target y."
    );
  });

  it("has a text-card display preset for new cards and board cards", () => {
    expect(getCardDisplayPreset("text-card")).toMatchObject({
      label: "Text card",
      displayMode: "text-card"
    });
  });

  it("builds text-card content with sensible fallbacks for missing fields", () => {
    const content = getTextCardContent(
      {
        ...customCard(),
        cardname: "",
        twin: "",
        summary: "",
        story: "",
        question: "",
        effectGood: ""
      },
      "upright"
    );

    expect(content.title).toBe("Untitled card");
    expect(content.twin).toBe("Custom thought card");
    expect(content.body).toBe("Untitled card");
    expect(content.effect).toBe("Untitled card");
  });

  it("applies text-card preset to current board cards", () => {
    const initial = sessionReducer(createSession(), {
      type: "card.place",
      cardId: "source-a",
      displayMode: "compact-name"
    });
    const state = sessionReducer(initial, {
      type: "board.applyDisplayPresetToCards",
      displayMode: "text-card",
      label: "Text card"
    });

    expect(state.tableau[0]).toMatchObject({
      displayMode: "text-card"
    });
    expect(state.tableau[0].previousDisplay).toMatchObject({
      displayMode: "compact-name"
    });
  });

  it("saves custom cards in the independent local custom card library", () => {
    const card = customCard();
    saveCustomCards([card]);

    expect(loadCustomCards()).toHaveLength(1);
    expect(loadCustomCards()[0]?.id).toBe(card.id);
  });

  it("exports custom cards to CSV with documented headers", () => {
    const csv = customCardsToCsv([customCard()]);

    expect(csv.split("\n")[0]).toBe(
      "cardname,scientific_twin,domain,subdomain,keywords,summary,question,story,effect_good,effect_bad,effect_mod,background_image,notes"
    );
    expect(csv).toContain("My Custom Hypothesis");
    expect(csv).toContain("User-defined variable");
  });

  it("imports custom cards from tolerant CSV field names", () => {
    const result = parseCustomCardsCsv(
      [
        "cardname,twin,domain,subdomain,keywords,summary,question,effectGood,effectBad,effectMod,notes",
        "Imported Card,Scientific Alias,Custom,Test,\"alpha; beta\",Summary?,Question?,Good,Bad,Mod,Private note"
      ].join("\n")
    );

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.cards[0]).toMatchObject({
      origin: "custom",
      cardname: "Imported Card",
      twin: "Scientific Alias",
      effectGood: "Good",
      effectBad: "Bad",
      effectMod: "Mod"
    });
    expect(result.cards[0].keywords).toEqual(["alpha", "beta"]);
    expect(result.cards[0].raw.notes).toBe("Private note");
  });

  it("skips CSV rows without cardname", () => {
    const result = parseCustomCardsCsv(["cardname,summary", ",No name"].join("\n"));

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("roundtrips custom cards through JSON export and import", () => {
    const json = createCustomCardsExportJson([customCard()]);
    const result = parseCustomCardsJson(json);

    expect(result.imported).toBe(1);
    expect(result.cards[0]).toMatchObject({
      id: "custom:test-card",
      cardname: "My Custom Hypothesis"
    });
  });

  it("remaps duplicate custom card ids on JSON import", () => {
    const result = parseCustomCardsJson(createCustomCardsExportJson([customCard()]), [
      "custom:test-card"
    ]);

    expect(result.cards[0].id).not.toBe("custom:test-card");
    expect(result.cards[0].id.startsWith("custom:")).toBe(true);
  });
});

describe("custom domains", () => {
  const customDomainSpec = JSON.stringify({
    schemaVersion: 1,
    domainId: "custom_alchemy",
    domainName: "Alchemy",
    shortName: "Al",
    description: "A custom alchemy domain.",
    color: "#776655",
    domainMasterCardName: "The Alchemy",
    subdomains: [{ name: "Elements", description: "Materials." }],
    cards: [
      {
        cardname: "The Alchemy",
        scientific_twin: "Alchemy master",
        keywords: "alchemy; master",
        summary: "Whole domain.",
        effect_good: "Frame the alchemy domain."
      },
      {
        cardname: "Salt",
        subdomain: "Elements",
        summary: "A stabilizing reagent."
      }
    ]
  });

  it("parses custom domain specs with embedded cards", () => {
    const result = parseCustomDomainSpecJson(customDomainSpec);

    expect(result.domain).toMatchObject({
      schemaVersion: 1,
      domainId: "custom_alchemy",
      domainName: "Alchemy",
      shortName: "Al",
      color: "#776655"
    });
    expect(result.domain.cards).toHaveLength(2);
    expect(result.domain.cards[0]).toMatchObject({
      origin: "custom",
      domain: "Alchemy",
      cardname: "The Alchemy",
      effectGood: "Frame the alchemy domain."
    });
  });

  it("fills optional custom domain fields with defaults", () => {
    const result = parseCustomDomainSpecJson(
      JSON.stringify({
        schemaVersion: 1,
        domainName: "Weather",
        cards: [{ cardname: "Storm" }]
      })
    );

    expect(result.domain).toMatchObject({
      domainId: "weather",
      shortName: "We",
      color: "#888888",
      domainMasterCardName: "The Weather"
    });
    expect(result.domain.cards[0].domain).toBe("Weather");
  });

  it("appends custom domains after canonical domains", () => {
    const result = parseCustomDomainSpecJson(customDomainSpec);

    expect(getAllDomainNames(["Source", "Aspect"], [result.domain])).toEqual([
      "Source",
      "Aspect",
      "Alchemy"
    ]);
  });

  it("makes custom domain cards available in card lookup", () => {
    const result = parseCustomDomainSpecJson(customDomainSpec);
    const cards = getCustomDomainCards([result.domain]);
    const cardsById = getCardsById(cards);

    expect(cardsById.get(cards[1].id)?.cardname).toBe("Salt");
  });

  it("creates drawable custom domain piles without changing canonical cycle", () => {
    const result = parseCustomDomainSpecJson(customDomainSpec);
    const cards = [testCard("source-a", "Source"), ...result.domain.cards];
    const piles = createDomainPiles(cards);
    const alchemyPile = piles.find((pile) => pile.domain === "Alchemy");
    const drawn = alchemyPile ? drawFromPile(alchemyPile) : null;

    expect(alchemyPile?.cardIds).toHaveLength(2);
    expect(drawn?.cardId).toBeTruthy();
    expect(createSession().drawCycle.order).toEqual(DOMAIN_ORDER);
  });

  it("keeps discovered folder-based custom domains inactive by default", () => {
    const discoveredCard = testCard("custom:alchemy:1-the-alchemy", "Alchemy", "The Alchemy");
    discoveredCard.origin = "custom-domain";
    discoveredCard.customDomainId = "alchemy";
    discoveredCard.raw.customDomainFolder = "alchemy_domain";
    const discovered = getDiscoveredCustomDomains([discoveredCard]);

    expect(discovered).toHaveLength(1);
    expect(DEFAULT_CUSTOM_DOMAIN_SETTINGS.activeCustomDomainIds).toEqual([]);
    expect(getActiveCustomDomainCards(discovered, [])).toEqual([]);
    expect(getActiveDomainNames(DOMAIN_ORDER, [])).toEqual(DOMAIN_ORDER);
  });

  it("enables folder-based custom domains explicitly", () => {
    const discoveredCard = testCard("custom:alchemy:1-the-alchemy", "Alchemy", "The Alchemy");
    discoveredCard.origin = "custom-domain";
    discoveredCard.customDomainId = "alchemy";
    const discovered = getDiscoveredCustomDomains([discoveredCard]);
    const activeCards = getActiveCustomDomainCards(discovered, ["alchemy"]);
    const activeDomains = getActiveDomainNames(DOMAIN_ORDER, discovered);

    expect(activeCards.map((card) => card.id)).toEqual(["custom:alchemy:1-the-alchemy"]);
    expect(activeDomains).toEqual([...DOMAIN_ORDER, "Alchemy"]);
    expect(createDomainPiles([testCard("source-a", "Source"), ...activeCards]).some((pile) => pile.domain === "Alchemy")).toBe(true);
  });

  it("persists custom domain activation settings separately from discovery", () => {
    stubLocalStorage();

    expect(loadCustomDomainSettings().activeCustomDomainIds).toEqual([]);
    saveCustomDomainSettings({ activeCustomDomainIds: ["alchemy"] });
    expect(loadCustomDomainSettings().activeCustomDomainIds).toEqual(["alchemy"]);
  });

  it("uses safe browser instructions for custom domain discovery", () => {
    expect(getCustomDomainsFolderPath()).toBe("custom_domains/");
    expect(getCustomDomainsSyncCommand()).toBe("pnpm sync:assets");
  });

  it("custom-domain discovery instructions are explicit and not a no-op", () => {
    const browserSource = fs.readFileSync(path.resolve("apps/web/src/ui/browser/CardBrowser.tsx"), "utf8");

    expect(browserSource).toContain("repository root");
    expect(browserSource).toContain("getCustomDomainsSyncCommand()");
    expect(browserSource).toContain("getCustomDomainsFolderPath()");
    expect(browserSource).toContain("Manage custom domains and enable the domain");
  });

  it("keeps custom content actions out of the File menu source", () => {
    const menuSource = fs.readFileSync(path.resolve("apps/web/src/ui/layout/MenuBar.tsx"), "utf8");

    expect(menuSource).not.toContain("New custom card");
    expect(menuSource).not.toContain("Export custom cards");
    expect(menuSource).not.toContain("Import custom cards");
    expect(menuSource).not.toContain("Manage custom domains");
  });

  it("keeps custom content actions in the card browser source", () => {
    const browserSource = fs.readFileSync(path.resolve("apps/web/src/ui/browser/CardBrowser.tsx"), "utf8");

    expect(browserSource).toContain("Custom Assets");
    expect(browserSource).toContain("Custom Cards");
    expect(browserSource).toContain("Custom Domains");
    expect(browserSource).toContain("Discover custom domains");
    expect(browserSource).toContain("Manage custom domains");
    expect(browserSource).toContain("Build custom domain");
    expect(browserSource).toContain("showCustomAssets &&");
  });

  it("hides orientation badges for hidden card instances in the source", () => {
    const cardSource = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/CardInstanceView.tsx"), "utf8");

    expect(cardSource).toContain("!placed.hidden && <OrientationBadge");
  });

  it("selects unselected cards before cycling orientation", () => {
    const cardSource = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/CardInstanceView.tsx"), "utf8");

    expect(cardSource).toContain("if (!selected)");
    expect(cardSource).toContain("if (event.detail > 1 || placed.hidden || isAspectCard(card)) return;");
    expect(cardSource).toContain("onCycleOrientation();");
    expect(cardSource).toContain("onReadingZoom();");
  });

  it("uses click-to-choose cards and a flip control in the draw choice modal", () => {
    const modalSource = fs.readFileSync(path.resolve("apps/web/src/ui/draw/DrawChoiceModal.tsx"), "utf8");

    expect(modalSource).toContain("Click a card to choose it");
    expect(modalSource).toContain("className=\"draw-choice-card-preview-button\"");
    expect(modalSource).toContain("onClick={() => onChoose(cardId)}");
    expect(modalSource).toContain("Flip to");
  });

  it("skips empty draw piles before disabling Next", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(appSource).toContain("getAvailableDomainFromCycle");
    expect(appSource).toContain("domainForDrawableRecommendation");
    expect(appSource).toContain("if (getAvailableDomainFromCycle(recommendation.domain)) return null;");
  });

  it("keeps pile inspector controls sticky and previews on hover", () => {
    const inspectorSource = fs.readFileSync(path.resolve("apps/web/src/ui/piles/PileInspector.tsx"), "utf8");
    const listSource = fs.readFileSync(path.resolve("apps/web/src/ui/piles/DrawPileCardList.tsx"), "utf8");
    const cssSource = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(inspectorSource).toContain("pile-inspector-sticky-header");
    expect(inspectorSource).toContain("Done");
    expect(listSource).toContain("pile-card-hover-preview");
    expect(cssSource).toContain(".pile-card-row button:hover .pile-card-hover-preview");
    expect(cssSource).toContain("grid-template-columns: 264px 264px");
    expect(cssSource).toContain("width: 264px");
  });

  it("guards timer finish actions and routes them through Next once", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(appSource).toContain("handledTimerFinishRef");
    expect(appSource).toContain("if (handledTimerFinishRef.current === finishKey) return;");
    expect(appSource).toContain("timer.actionOnFinish === \"next\"");
    expect(appSource).toContain("timer.actionOnFinish === \"ask-before-next\"");
    expect(appSource).toContain("drawNext();");
    expect(appSource).toContain("Timer triggered Next");
  });

  it("includes the wizard hint for later Session menu editing", () => {
    const wizardSource = fs.readFileSync(path.resolve("apps/web/src/ui/session/NewSessionWizard.tsx"), "utf8");

    expect(wizardSource).toContain("You can add or edit more session details later under the Session menu.");
  });

  it("seeds the new session wizard from the default mode, not the current session mode", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
    const wizardSource = fs.readFileSync(path.resolve("apps/web/src/ui/session/NewSessionWizard.tsx"), "utf8");

    expect(DEFAULT_MODE_ID).toBe("standard");
    expect(wizardSource).toContain("initialModeId = DEFAULT_MODE_ID");
    expect(wizardSource).toContain("useState(initialModeId || DEFAULT_MODE_ID)");
    expect(appSource).toContain("initialModeId={DEFAULT_MODE_ID}");
    expect(appSource).not.toContain('initialModeId={session.activeModeId ?? "standard"}');
  });

  it("keeps custom-card and custom-domain origins distinct", () => {
    const localCard = customCard("custom:local-card");
    const domainCard = testCard("custom:alchemy:1-the-alchemy", "Alchemy", "The Alchemy");
    domainCard.origin = "custom-domain";
    domainCard.customDomainId = "alchemy";

    expect(localCard.origin).toBe("custom");
    expect(domainCard.origin).toBe("custom-domain");
  });

  it("parses the repository example domain metadata file", () => {
    const metadata = parseDomainMetadataFile(
      path.resolve("custom_domains/example_custom_domain/templates/domain_metadata.txt")
    );

    expect(metadata).toMatchObject({
      domainName: "example domain",
      domainFolderName: "example_custom_domain",
      dataCsvName: "card_data_example_domain.csv",
      templateSlaName: "template_example_domain.sla"
    });
  });

  it("scans custom domain folders while ignoring generator folders", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-custom-domain-"));
    const domainRoot = path.join(root, "demo_domain");
    const generatorRoot = path.join(root, "scribus_generator");
    fs.mkdirSync(path.join(domainRoot, "templates"), { recursive: true });
    fs.mkdirSync(generatorRoot, { recursive: true });
    fs.writeFileSync(
      path.join(domainRoot, "templates", "domain_metadata.txt"),
      [
        'domain_name="demo domain"',
        'domain_folder_name="demo_domain"',
        'data_csv_name="card_data_demo.csv"',
        'template_sla_name="template_demo.sla"'
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(domainRoot, "templates", "card_data_demo.csv"),
      [
        "nr,cardname,domain,subdomain,summary,twin,keywords,effect_good,effect_bad,effect_mod,question,story,art",
        "1,Demo Master,Demo Dom,,Summary,Twin,alpha,Good,Bad,Mod,Question,Story,"
      ].join("\n")
    );

    const summary = scanCustomDomainCards(
      {
        csvRoot: "",
        imageRoot: "",
        pdfRoot: "",
        iconRoot: null,
        pdfPreviewDpi: 72,
        pdfPreviewThumbHeight: 700,
        pdfPreviewReadingHeight: 1800,
        pdfPreviewFormat: "png",
        pdfPreviewWebpQuality: 85,
        outRoot: path.join(root, "public"),
        outImageRoot: path.join(root, "public", "images"),
        outPdfRoot: path.join(root, "public", "pdfs"),
        outIconRoot: path.join(root, "public", "icons"),
        outPdfPreviewRoot: path.join(root, "public", "pdf-previews"),
        outManifest: path.join(root, "public", "manifest.json"),
        customDomainsRoot: root,
        handbookPdf: path.join(root, "handbook.pdf"),
        topologyBackgroundRoot: path.join(root, "backgrounds")
      },
      null,
      {
        renderer: null,
        dpi: 72,
        thumbHeight: 700,
        readingHeight: 1800,
        format: "png",
        pdfsMatched: 0,
        frontPreviewsGenerated: 0,
        backPreviewsGenerated: 0,
        previewsSkipped: 0,
        sampleDimensions: []
      }
    );

    expect(summary.domainsFound).toBe(1);
    expect(summary.cardsLoaded).toBe(1);
    expect(summary.ignoredFolders).toEqual(["scribus_generator"]);
    expect(summary.details[0]).toContain("demo_domain: 1 cards");
    expect(summary.cards[0]).toMatchObject({
      id: "custom:demo-domain:1-demo-master",
      origin: "custom-domain",
      customDomainId: "demo-domain",
      domain: "Demo Dom"
    });
    expect(summary.warnings.some((warning) => warning.includes("No custom-domain PDF matched"))).toBe(true);
  });

  it("keeps handbook bundling and topology backgrounds in the manifest builder", () => {
    const source = fs.readFileSync(
      path.resolve("packages/deck-assets/src/buildManifest.ts"),
      "utf8"
    );

    expect(source).toContain("copyHandbookPdf(config, warnings)");
    expect(source).toContain("handbook: handbookPath ? { pdfPath: handbookPath }");
    expect(source).toContain("copyTopologyBackgrounds(config, warnings)");
    expect(source).toContain("topologyBackgrounds");
  });
});

describe("card asset resolution", () => {
  it("resolves CSV art field before cardname guesses", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-art-resolution-"));
    const domainImages = path.join(root, "images", "Void");
    fs.mkdirSync(domainImages, { recursive: true });
    const explicit = path.join(domainImages, "some_other_file.png");
    const misleading = path.join(domainImages, "No_Thought.png");
    fs.writeFileSync(explicit, "explicit");
    fs.writeFileSync(misleading, "wrong");

    const resolved = resolveCsvArtAsset({
      artReference: "some_other_file.png",
      files: [explicit, misleading],
      searchRoots: [domainImages],
      exts: [".png"]
    });

    expect(resolved).toBe(explicit);
    expect(findBestAsset([misleading], "Enter / Leave", [".png"])).toBeNull();
  });

  it("keeps separate art mappings for Enter / Leave, Source / Sink, and No Thought fixtures", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-art-fixture-"));
    const domainImages = path.join(root, "images", "Void");
    fs.mkdirSync(domainImages, { recursive: true });
    const enterLeave = path.join(domainImages, "enter_leave_art.png");
    const sourceSink = path.join(domainImages, "source_sink_art.png");
    const noThought = path.join(domainImages, "no_thought_art.png");
    for (const file of [enterLeave, sourceSink, noThought]) fs.writeFileSync(file, "asset");
    const files = [enterLeave, sourceSink, noThought];

    expect(resolveCsvArtAsset({
      artReference: "enter_leave_art.png",
      files,
      searchRoots: [domainImages],
      exts: [".png"]
    })).toBe(enterLeave);
    expect(resolveCsvArtAsset({
      artReference: "source_sink_art.png",
      files,
      searchRoots: [domainImages],
      exts: [".png"]
    })).toBe(sourceSink);
    expect(resolveCsvArtAsset({
      artReference: "no_thought_art.png",
      files,
      searchRoots: [domainImages],
      exts: [".png"]
    })).toBe(noThought);
  });

  it("resolves compressed WebP art when CSV references a PNG basename", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsd-webp-resolution-"));
    const domainImages = path.join(root, "images_compressed", "Card_graphics", "Source");
    fs.mkdirSync(domainImages, { recursive: true });
    const webp = path.join(domainImages, "Gambler.webp");
    fs.writeFileSync(webp, "webp");

    expect(resolveCsvArtAsset({
      artReference: "Gambler.png",
      files: [webp],
      searchRoots: [domainImages],
      exts: [".webp", ".png", ".jpg", ".jpeg"]
    })).toBe(webp);
  });

  it("inspector asset resolver uses manifest fields without guessing", () => {
    const card = {
      ...testCard("enter-leave", "Void", "Enter / Leave"),
      imagePath: "/deck/images/void/some_other_file.png",
      frontImage: "/deck/pdf-previews/void/enter-leave_front.png",
      backImage: "/deck/pdf-previews/void/enter-leave_back.png",
      frontReadingImage: "/deck/pdf-previews/reading/void/enter-leave_front_reading.png",
      backReadingImage: "/deck/pdf-previews/reading/void/enter-leave_back_reading.png",
      pdfPath: "/deck/pdfs/void/enter-leave.pdf"
    };

    expect(getInspectorAssetSources(card)).toEqual({
      artImage: "/deck/images/void/some_other_file.png",
      frontImage: "/deck/pdf-previews/reading/void/enter-leave_front_reading.png",
      backImage: "/deck/pdf-previews/reading/void/enter-leave_back_reading.png",
      pdfPath: "/deck/pdfs/void/enter-leave.pdf"
    });
  });

  it("chooses reading previews for desk cards and thumbnails for compact UI", () => {
    const card = {
      ...testCard("enter-leave", "Void", "Enter / Leave"),
      imagePath: "/deck/images/void/art.webp",
      frontThumbImage: "/deck/pdf-previews/thumb/void/enter-leave_front_thumb.webp",
      backThumbImage: "/deck/pdf-previews/thumb/void/enter-leave_back_thumb.webp",
      frontImage: "/deck/pdf-previews/reading/void/legacy_front.png",
      backImage: "/deck/pdf-previews/reading/void/legacy_back.png",
      frontReadingImage: "/deck/pdf-previews/reading/void/enter-leave_front_reading.webp",
      backReadingImage: "/deck/pdf-previews/reading/void/enter-leave_back_reading.webp"
    };

    expect(getCardFrontImage(card)).toBe("/deck/pdf-previews/reading/void/enter-leave_front_reading.webp");
    expect(getCardBackImage(card)).toBe("/deck/pdf-previews/reading/void/enter-leave_back_reading.webp");
    expect(getCardFrontPreview(card, "desk")).toBe("/deck/pdf-previews/reading/void/enter-leave_front_reading.webp");
    expect(getCardBackPreview(card, "desk")).toBe("/deck/pdf-previews/reading/void/enter-leave_back_reading.webp");
    expect(getCardFrontPreviewCandidates(card, "desk")).toEqual([
      "/deck/pdf-previews/reading/void/enter-leave_front_reading.webp",
      "/deck/pdf-previews/reading/void/legacy_front.png",
      "/deck/pdf-previews/thumb/void/enter-leave_front_thumb.webp"
    ]);
    expect(getCardBackPreviewCandidates(card, "desk")).toEqual([
      "/deck/pdf-previews/reading/void/enter-leave_back_reading.webp",
      "/deck/pdf-previews/reading/void/legacy_back.png",
      "/deck/pdf-previews/thumb/void/enter-leave_back_thumb.webp"
    ]);
    expect(getCardFrontThumbnail(card)).toBe("/deck/pdf-previews/thumb/void/enter-leave_front_thumb.webp");
    expect(getCardBackThumbnail(card)).toBe("/deck/pdf-previews/thumb/void/enter-leave_back_thumb.webp");
    expect(getCardArtImage(card, "inspector")).toBe("/deck/images/void/art.webp");
  });

  it("falls back from missing reading previews to legacy previews and thumbnails", () => {
    expect(getCardFrontImage({
      ...testCard("legacy", "Void"),
      frontImage: "/deck/pdf-previews/void/legacy_front.png",
      frontThumbImage: "/deck/pdf-previews/thumb/void/legacy_front_thumb.webp"
    })).toBe("/deck/pdf-previews/void/legacy_front.png");

    expect(getCardFrontImage({
      ...testCard("thumb-only", "Void"),
      frontThumbImage: "/deck/pdf-previews/thumb/void/thumb_front.webp"
    })).toBe("/deck/pdf-previews/thumb/void/thumb_front.webp");

    expect(getCardFrontPreview({
      ...testCard("art-only", "Void"),
      imagePath: "/deck/images/void/art.webp"
    }, "desk")).toBeNull();
    expect(getCardArtImage({
      ...testCard("art-only", "Void"),
      imagePath: "/deck/images/void/art.webp"
    }, "inspector")).toBe("/deck/images/void/art.webp");
    expect(getCardPdfUrl({
      pdfPath: "/deck/pdfs/void/card.pdf"
    })).toBe("/deck/pdfs/void/card.pdf");
  });

  it("only advertises generated preview paths after files exist", () => {
    const buildManifest = fs.readFileSync(path.resolve("packages/deck-assets/src/buildManifest.ts"), "utf8");
    const existenceCheckIndex = buildManifest.indexOf("fs.existsSync(job.outputPath)");
    const assignIndex = buildManifest.indexOf("result.frontReadingImage = browserPath");

    expect(existenceCheckIndex).toBeGreaterThan(-1);
    expect(assignIndex).toBeGreaterThan(existenceCheckIndex);
  });
});

describe("view settings storage", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it("defaults showMinimap to true", () => {
    expect(loadViewSettings().showMinimap).toBe(true);
  });

  it("defaults showCustomAssets to true", () => {
    expect(loadViewSettings().showCustomAssets).toBe(true);
  });

  it("defaults mythic card labels to true", () => {
    expect(loadViewSettings().showMythicNames).toBe(true);
  });

  it("persists showMinimap=false", () => {
    const settings = loadViewSettings();
    saveViewSettings({ ...settings, showMinimap: false });

    expect(loadViewSettings().showMinimap).toBe(false);
  });

  it("migrates old settings without showMinimap to true", () => {
    localStorage.setItem(
      "dsd.viewSettings",
      JSON.stringify({
        theme: "dark",
        showGrid: false
      })
    );

    expect(loadViewSettings().showMinimap).toBe(true);
  });

  it("persists showCustomAssets=false", () => {
    saveViewSettings({ ...loadViewSettings(), showCustomAssets: false });

    expect(loadViewSettings().showCustomAssets).toBe(false);
  });

  it("migrates old settings without showCustomAssets to true", () => {
    localStorage.setItem(
      "dsd.viewSettings",
      JSON.stringify({
        theme: "dark",
        showBrowser: true
      })
    );

    expect(loadViewSettings().showCustomAssets).toBe(true);
  });

  it("defaults showTimer to false and persists it", () => {
    expect(loadViewSettings().showTimer).toBe(false);
    saveViewSettings({ ...loadViewSettings(), showTimer: true });
    expect(loadViewSettings().showTimer).toBe(true);
  });

  it("defaults topology image source to none and persists it", () => {
    expect(loadViewSettings().topologyImageSource).toBe("none");
    saveViewSettings({ ...loadViewSettings(), topologyImageSource: "zonal" });
    expect(loadViewSettings().topologyImageSource).toBe("zonal");
  });

  it("defaults and clamps overlay scale settings", () => {
    expect(loadViewSettings().pileOverlayScale).toBe(1);
    expect(loadViewSettings().choicePreviewScale).toBe(1);
    expect(loadViewSettings().nextPanelPosition).toBeNull();
    expect(clampOverlayScale(0.2)).toBe(0.75);
    expect(clampOverlayScale(3)).toBe(2);
    expect(clampOverlayScale(1.35)).toBe(1.35);

    localStorage.setItem(
      "dsd.viewSettings",
      JSON.stringify({
        pileOverlayScale: 0.1,
        choicePreviewScale: 3.5
      })
    );

    expect(loadViewSettings().pileOverlayScale).toBe(0.75);
    expect(loadViewSettings().choicePreviewScale).toBe(2);
  });

  it("persists and normalizes the dragged Next panel position", () => {
    expect(normalizeOverlayPosition({ x: 42.4, y: 86.7 })).toEqual({ x: 42, y: 87 });
    expect(normalizeOverlayPosition({ x: -10, y: 2 })).toEqual({ x: 8, y: 8 });
    expect(normalizeOverlayPosition({ x: "bad", y: 2 })).toBeNull();

    saveViewSettings({ ...loadViewSettings(), nextPanelPosition: { x: 180, y: 96 } });

    expect(loadViewSettings().nextPanelPosition).toEqual({ x: 180, y: 96 });
  });
});

describe("topology background images", () => {
  it("classifies background filenames by source and domain", () => {
    expect(classifyTopologyBackground("BG_Source.png")).toEqual({
      domain: "Source",
      source: "thematic"
    });
    expect(classifyTopologyBackground("Zonal_BG_Void.png")).toEqual({
      domain: "Void",
      source: "zonal"
    });
    expect(classifyTopologyBackground("Uniform_BG_Aspect.png")).toEqual({
      domain: "Aspect",
      source: "uniform"
    });
  });

  it("maps topology background paths and opacity from settings", () => {
    const backgrounds = {
      Source: {
        thematic: "/deck/backgrounds/BG_Source.png",
        zonal: "/deck/backgrounds/Zonal_BG_Source.png"
      }
    };

    expect(getTopologyBackgroundPath(backgrounds, "Source", "thematic")).toBe(
      "/deck/backgrounds/BG_Source.png"
    );
    expect(getTopologyBackgroundPath(backgrounds, "Source", "none")).toBeNull();
    expect(getTopologyBackgroundOpacity("hidden", "thematic")).toBe(0);
    expect(getTopologyBackgroundOpacity("subtle", "thematic")).toBeLessThan(
      getTopologyBackgroundOpacity("strong", "thematic")
    );
  });
});

describe("timer utilities", () => {
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(61000)).toBe("01:01");
    expect(formatDuration(3661000)).toBe("01:01:01");
  });

  it("computes countdown remaining time", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = Date.parse("2026-01-01T00:00:30.000Z");

    expect(computeTimerDisplay({
      visible: false,
      mode: "countdown",
      status: "running",
      startedAt,
      accumulatedMs: 0,
      durationMs: 120000,
      actionOnFinish: "none",
      autoRestart: false
    }, now)).toMatchObject({
      elapsedMs: 30000,
      remainingMs: 90000,
      status: "running",
      isFinished: false
    });
  });

  it("marks countdown finished once elapsed reaches duration", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const now = Date.parse("2026-01-01T00:02:01.000Z");

    expect(computeTimerDisplay({
      visible: false,
      mode: "countdown",
      status: "running",
      startedAt,
      accumulatedMs: 0,
      durationMs: 120000,
      actionOnFinish: "none",
      autoRestart: false
    }, now)).toMatchObject({
      remainingMs: 0,
      status: "finished",
      isFinished: true
    });
  });

  it("does not advance paused timers", () => {
    const now = Date.parse("2026-01-01T00:02:01.000Z");

    expect(computeTimerDisplay({
      visible: false,
      mode: "countdown",
      status: "paused",
      accumulatedMs: 30000,
      durationMs: 120000,
      actionOnFinish: "none",
      autoRestart: false
    }, now)).toMatchObject({
      elapsedMs: 30000,
      remainingMs: 90000,
      status: "paused",
      isFinished: false
    });
  });
});

describe("minimap geometry", () => {
  it("defines a finite tableau with default view bounds inside it", () => {
    expect(TABLEAU_WIDTH).toBeGreaterThan(0);
    expect(TABLEAU_HEIGHT).toBeGreaterThan(0);
    expect(TABLEAU_WIDTH).toBeLessThanOrEqual(3000);
    expect(TABLEAU_HEIGHT).toBeLessThanOrEqual(2200);
    expect(TABLEAU_DEFAULT_VIEW_BOUNDS).toEqual(ACTIVE_BOARD_BOUNDS);
    expect(TABLEAU_DEFAULT_VIEW_BOUNDS.x).toBeGreaterThanOrEqual(0);
    expect(TABLEAU_DEFAULT_VIEW_BOUNDS.y).toBeGreaterThanOrEqual(0);
    expect(TABLEAU_DEFAULT_VIEW_BOUNDS.x + TABLEAU_DEFAULT_VIEW_BOUNDS.width).toBeLessThanOrEqual(TABLEAU_WIDTH);
    expect(TABLEAU_DEFAULT_VIEW_BOUNDS.y + TABLEAU_DEFAULT_VIEW_BOUNDS.height).toBeLessThanOrEqual(TABLEAU_HEIGHT);
    expect(TABLEAU_WIDTH * TABLEAU_HEIGHT).toBeLessThanOrEqual(
      ACTIVE_BOARD_BOUNDS.width * ACTIVE_BOARD_BOUNDS.height * 5
    );
  });

  it("keeps standard view bookmark bounds inside the finite tableau", () => {
    expect(STANDARD_VIEW_BOOKMARKS.map((bookmark) => bookmark.id)).toEqual([
      "drawing-zone",
      "model-core",
      "volition",
      "source"
    ]);

    for (const bounds of [
      DRAWING_ZONE_BOUNDS,
      MODEL_CORE_BOUNDS,
      VOLITION_BOUNDS,
      SOURCE_BOUNDS,
      ...STANDARD_VIEW_BOOKMARKS.map((bookmark) => bookmark.bounds)
    ]) {
      expect(boundsInsideTableau(bounds)).toBe(true);
    }
    expect(MODEL_CORE_BOUNDS.y).toBeGreaterThan(VOLITION_BOUNDS.y + VOLITION_BOUNDS.height);
    expect(MODEL_CORE_BOUNDS.y + MODEL_CORE_BOUNDS.height).toBeLessThan(SOURCE_BOUNDS.y);
    expect(MODEL_CORE_BOUNDS.width).toBeLessThan(VOLITION_BOUNDS.width);
    expect(MODEL_CORE_BOUNDS.height).toBeLessThan(850);
  });

  it("computes fit transforms for bookmark bounds", () => {
    const transform = computeViewTransformForBounds(1000, 700, MODEL_CORE_BOUNDS, {
      padding: 80,
      minScale: 0.2,
      maxScale: 2.6
    });

    expect(transform.scale).toBeGreaterThan(0.2);
    expect(Number.isFinite(transform.positionX)).toBe(true);
    expect(Number.isFinite(transform.positionY)).toBe(true);
  });

  it("computes object bounds for cards, notes, and arrows", () => {
    const bounds = computeObjectBounds({
      tableau: [
        {
          instanceId: "one",
          cardId: "card-one",
          x: 400,
          y: 500,
          rotation: 0,
          orientation: "upright",
          displayMode: "text-card",
          face: "front",
          scale: 1,
          hidden: false,
          ablated: false
        },
        {
          instanceId: "two",
          cardId: "card-two",
          x: 900,
          y: 850,
          rotation: 0,
          orientation: "upright",
          displayMode: "pdf-both",
          face: "both",
          scale: 1.5,
          hidden: false,
          ablated: false
        }
      ],
      notes: [
        {
          id: "note-one",
          type: "note",
          x: 250,
          y: 300,
          text: "Remember this",
          noteKind: "insight"
        }
      ],
      arrows: [
        {
          id: "arrow-one",
          type: "arrow",
          x1: 1200,
          y1: 100,
          x2: 1400,
          y2: 240
        }
      ]
    });

    expect(bounds).toEqual({
      x: 250,
      y: 100,
      width: 1150,
      height: 970
    });
  });

  it("returns null object bounds when there are no fit targets", () => {
    expect(computeObjectBounds({ tableau: [], notes: [], arrows: [] })).toBeNull();
  });

  it("computes scaled card bounds for temporary reading zoom", () => {
    expect(computeCardBounds({
      instanceId: "scaled",
      cardId: "card-scaled",
      x: 500,
      y: 600,
      rotation: 0,
      orientation: "upright",
      displayMode: "text-card",
      face: "front",
      scale: 2,
      hidden: false,
      ablated: false
    })).toEqual({
      x: 437,
      y: 512,
      width: 252,
      height: 352
    });
  });

  it("computes the visible viewport in tableau coordinates", () => {
    expect(computeMinimapViewportRect({
      scale: 1,
      positionX: 0,
      positionY: 0,
      viewportWidth: 1000,
      viewportHeight: 700,
      tableauWidth: 5000,
      tableauHeight: 3500
    })).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 700
    });
  });

  it("shrinks viewport when zoomed and moves when panned", () => {
    const rect = computeMinimapViewportRect({
      scale: 2,
      positionX: -600,
      positionY: -300,
      viewportWidth: 1000,
      viewportHeight: 700,
      tableauWidth: 5000,
      tableauHeight: 3500
    });

    expect(rect).toEqual({
      x: 300,
      y: 150,
      width: 500,
      height: 350
    });
  });

  it("clamps viewport to tableau bounds", () => {
    const rect = computeMinimapViewportRect({
      scale: 1,
      positionX: 200,
      positionY: 100,
      viewportWidth: 6000,
      viewportHeight: 5000,
      tableauWidth: 5000,
      tableauHeight: 3500
    });

    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 5000,
      height: 3500
    });
  });
});

describe("card context menu", () => {
  it("resolves public PDF URLs with the Vite base path", () => {
    expect(resolvePublicAssetUrl("deck/images/a.webp", "/")).toBe("/deck/images/a.webp");
    expect(resolvePublicAssetUrl("deck/pdfs/a.pdf", "/data_science_deck/")).toBe(
      "/data_science_deck/deck/pdfs/a.pdf"
    );
    expect(resolvePublicAssetUrl("/deck/pdfs/a.pdf", "/data_science_deck/")).toBe(
      "/data_science_deck/deck/pdfs/a.pdf"
    );
    expect(resolvePublicAssetUrl("/data_science_deck/deck/pdfs/a.pdf", "/data_science_deck/")).toBe(
      "/data_science_deck/deck/pdfs/a.pdf"
    );
    expect(resolvePublicAssetUrl("deck/pdfs/a.pdf", "./")).toBe("deck/pdfs/a.pdf");
    expect(resolvePublicAssetUrl("https://example.com/a.pdf", "/data_science_deck/")).toBe(
      "https://example.com/a.pdf"
    );
  });

  it("opens PDF assets with window.open using the resolved public URL", () => {
    const previousWindow = globalThis.window;
    const open = vi.fn();
    Object.defineProperty(globalThis, "window", {
      value: { open },
      configurable: true
    });

    expect(openPdfAsset("deck/pdfs/aspect/the-aspect.pdf")).toBe(true);
    expect(open).toHaveBeenCalledWith("/deck/pdfs/aspect/the-aspect.pdf", "_blank", "noopener,noreferrer");
    expect(openPdfAsset("deck/pdfs/not-a-pdf.txt")).toBe(false);

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true
    });
  });

  it("uses the selected card instance scale for the size slider", () => {
    const instance = {
      ...placedCard(),
      scale: 1.4
    };
    const sizeMenu = getCardContextMenuItems(instance, "Source").find(
      (item) => item.id === "size"
    );
    const slider = sizeMenu?.children?.find((item) => item.id === "size-slider");

    expect(slider?.control?.value).toBe(1.4);
    expect(slider?.control?.actionForValue(1.75)).toMatchObject({
      type: "card.setScale",
      instanceId: instance.instanceId,
      scale: 1.75
    });
  });

  it("does not expose enabled no-op card context menu leaves", () => {
    const items = getCardContextMenuItems({ ...placedCard(), scale: 1 }, "Source", "/card.pdf");

    expect(findEnabledNoopMenuItems(items)).toEqual([]);
  });

  it("uses a direct PDF asset opener for Open PDF context menu actions", () => {
    const items = getCardContextMenuItems(
      { ...placedCard(), scale: 1 },
      "Source",
      "deck/pdfs/source/the-source.pdf"
    );
    const openPdf = items
      .find((item) => item.id === "face-pdf")
      ?.children?.find((item) => item.id === "open-pdf");

    expect(openPdf?.href).toBeUndefined();
    expect(openPdf?.enabled).toBe(true);
    expect(openPdf?.onClick).toEqual(expect.any(Function));
  });

  it("limits Aspect card orientation menu to modifier", () => {
    const orientation = getCardContextMenuItems(placedCard(), "Aspect").find(
      (item) => item.id === "orientation"
    );

    expect(orientation?.children?.map((item) => item.id)).toEqual(["set-modifier"]);
  });

  it("does not duplicate hidden/reveal context actions", () => {
    const secret = getCardContextMenuItems({ ...placedCard(), hidden: true }, "Source").find(
      (item) => item.id === "secret"
    );

    expect(secret?.children?.map((item) => item.id)).toEqual(["reveal"]);
  });
});

describe("card classification", () => {
  it("classifies The_Aspect as the Aspect domain master", () => {
    expect(isDomainMasterCard(testCard("aspect-master", "Aspect", "The_Aspect", "Uncategorized"))).toBe(true);
  });
});

describe("LLM context export", () => {
  it("exports rich interpretation context without private paths", () => {
    const card = {
      ...testCard("source-a", "Source", "The Source"),
      summary: "Phenomenon",
      twin: "Scientific source",
      keywords: ["data"],
      question: "What is observed?",
      story: "Story",
      effectGood: "Grounded",
      effectBad: "Ungrounded",
      effectMod: "As source",
      pdfPath: "/home/private/card.pdf",
      imagePath: "/home/private/card.png",
      raw: {
        cardname: "The Source",
        pdf: "/home/private/card.pdf",
        art: "../../private/art.png",
        safeField: "safe"
      }
    };
    const neighbor = {
      ...testCard("structure-a", "Structure", "The Structure"),
      effectGood: "Coherent assumptions"
    };
    const state = {
      ...createSession(),
      title: "Session",
      question: "Question?",
      tableau: [
        { ...placedCard(), cardId: "source-a" },
        { ...placedCard(), instanceId: "nearby", cardId: "structure-a", x: 170, y: 230 }
      ]
    };
    const context = buildInterpretationContextJson({
      session: state,
      cardsById: new Map([[card.id, card], [neighbor.id, neighbor]]),
      activeMode: gameModes.find((mode) => mode.id === "free") ?? null,
      modeRecommendation: {
        label: "Next",
        description: "Draw next",
        actionKind: "draw-random",
        domain: "Source"
      }
    });
    const markdown = buildInterpretationContextMarkdown(context);
    const serialized = JSON.stringify(context);

    expect(context.placedCards[0]).toMatchObject({
      cardId: "source-a",
      cardname: "The Source",
      domain: "Source",
      activeEffect: "Grounded"
    });
    expect(context.placedCards[0]?.nearestCards[0]).toMatchObject({
      cardId: "structure-a",
      domain: "Structure"
    });
    expect(serialized).not.toContain("/home/private");
    expect(serialized).not.toContain("card.pdf");
    expect(context.placedCards[0]?.raw).toMatchObject({ safeField: "safe" });
    expect(context.instruction).toBe(
      "Interpret this Data Science Deck session scientifically. Treat the cards as structured prompts for model criticism, not as fortune telling. Focus on modelling assumptions, uncertainty, missing variables, model behaviour, decision pressure, contradictions, and next modelling actions."
    );
    expect(markdown).toContain("The Data Science Deck is a compact tool for structured thinking.");
  });

  it("exports an empty board interpretation context", () => {
    const context = buildInterpretationContextJson({
      session: createSession(),
      cardsById: new Map(),
      activeMode: null,
      modeRecommendation: null
    });

    expect(context.placedCards).toEqual([]);
    expect(buildInterpretationContextMarkdown(context)).toContain("No cards are currently placed");
  });

  it("builds an external-AI prompt for mode recommendation", () => {
    const prompt = buildModeRecommendationPrompt(gameModes, "Should I use y = ax + b?");

    expect(prompt).toContain("ChatGPT or another assistant");
    expect(prompt).toContain("compact tool for structured thinking");
    expect(prompt).toContain("A = Absent");
    expect(prompt).toContain("Should I use y = ax + b?");
    expect(prompt).toContain("standard");
  });
});

describe("startup intro and help overview", () => {
  it("shows the startup intro by default on desktop and respects the hide flag", () => {
    stubLocalStorage();

    expect(shouldShowStartupIntro(false)).toBe(true);
    expect(shouldShowStartupIntro(true)).toBe(true);

    localStorage.setItem(LEGACY_STARTUP_INTRO_STORAGE_KEY, "true");
    expect(shouldShowStartupIntro(false)).toBe(true);

    setStartupIntroHidden(true);
    expect(localStorage.getItem(STARTUP_INTRO_STORAGE_KEY)).toBe("true");
    expect(localStorage.getItem(LEGACY_STARTUP_INTRO_STORAGE_KEY)).toBeNull();
    expect(shouldShowStartupIntro(false)).toBe(false);

    setStartupIntroHidden(false);
    expect(localStorage.getItem(STARTUP_INTRO_STORAGE_KEY)).toBeNull();
    expect(shouldShowStartupIntro(false)).toBe(true);
  });

  it("keeps the intro content available as the first help page", () => {
    expect(guideSections[0].id).toBe("overview");
    expect(guideSections[0].title).toContain("Data Science Deck");
    expect(guideSections[0].intro).toContain("compact tool for structured thinking");
    expect(guideSections[0].intro).toContain("mathematical modelling");
    expect(guideSections[0].intro).toContain("machine learning");
    expect(guideSections[0].intro).toContain("data science");
    const overviewBody = guideSections[0].blocks.map((block) => block.body).join(" ");
    expect(overviewBody).toContain("Start with Standard");
    expect(overviewBody).toContain("press Next");
    expect(overviewBody).toContain("drag and drop");
    expect(overviewBody).toContain("not a game about points");
    expect(overviewBody).toContain("winning condition");
    expect(overviewBody).toContain("manual");
    expect(introLead).toContain("compact tool for structured thinking");
    expect(introLead).toContain("machine learning");
    expect(introHowToStartText).toContain("press Next");
    expect(introHowToStartText).toContain("drawing");
    expect(introHowToStartText).toContain("choosing");
    expect(introHowToStartText).toContain("drag and drop");
    expect(introNoPointsText).toContain("not a game about points");
    expect(introNoPointsText).toContain("winning condition");
    expect(introManualText).toContain("manual");
    expect(introStandardText).toContain("Start with Standard");
    expect(introStandardText).toContain("Abstraction");
  });

  it("renders clickable recommended mode cards and example actions in the intro", () => {
    const introSource = fs.readFileSync(path.resolve("apps/web/src/ui/intro/IntroWindow.tsx"), "utf8");

    expect(introSource).toContain("Recommended modes");
    expect(introSource).toContain("Standard <span>Default</span>");
    expect(introSource).toContain('selectMode("standard")');
    expect(introSource).toContain('selectMode("abstraction")');
    expect(introSource).toContain("See an example");
    expect(introSource).toContain("sensor-calibration-review");
    expect(introSource).toContain("business-strategy-abstraction");
    expect(introSource).toContain("Open Manual PDF");
    expect(introSource).toContain("resolveManualPdfUrl");
    expect(introSource).toContain('target="_blank"');
  });

  it("wires Help to reopen the startup intro", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
    const guidePanelSource = fs.readFileSync(path.resolve("apps/web/src/ui/help/GuidePanel.tsx"), "utf8");

    expect(appSource).toContain("showStartupIntroFromHelp");
    expect(appSource).toContain("setStartupIntroHidden(false)");
    expect(appSource).toContain("setStartupIntroOpen(true)");
    expect(appSource).toContain("onShowStartupIntro={showStartupIntroFromHelp}");
    expect(guidePanelSource).toContain("Show startup intro");
    expect(guidePanelSource).toContain("onShowStartupIntro");
  });

  it("resolves the manual PDF URL through the public asset base", () => {
    expect(resolveManualPdfUrl("deck/handbook/handbook.pdf")).toBe("/deck/handbook/handbook.pdf");
    expect(resolvePublicAssetUrl("deck/handbook/handbook.pdf", "/data_science_deck/")).toBe(
      "/data_science_deck/deck/handbook/handbook.pdf"
    );
  });
});

describe("example session", () => {
  it("builds a demo board with cards, notes, and arrows", () => {
    const cards = DOMAIN_ORDER.flatMap((domain, index) => [
      testCard(`${domain.toLowerCase()}-${index}-a`, domain, `${domain} A`),
      testCard(`${domain.toLowerCase()}-${index}-b`, domain, `${domain} B`)
    ]);
    const session = buildExampleSession(cards);

    expect(session.tableau.length).toBeGreaterThanOrEqual(8);
    expect(session.tableau.length).toBeLessThanOrEqual(10);
    expect(session.notes.length).toBeGreaterThan(0);
    expect(session.arrows.length).toBeGreaterThan(0);
    expect(session.piles.length).toBeGreaterThan(0);
  });

  it("places example session cards in their domain regions", () => {
    const cards = DOMAIN_ORDER.flatMap((domain, index) => [
      testCard(`${domain.toLowerCase()}-${index}-a`, domain, `${domain} A`),
      testCard(`${domain.toLowerCase()}-${index}-b`, domain, `${domain} B`)
    ]);
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const session = buildExampleSession(cards);

    for (const instance of session.tableau) {
      const card = cardsById.get(instance.cardId);
      expect(card).toBeTruthy();
      if (!card || card.domain === "Aspect") continue;
      expect(isPointInsideScriptedDomain(card, instance.x, instance.y)).toBe(true);
    }
  });

  it("resolves scripted cards by id, domain/name, and domain/number", () => {
    const cards = [
      { ...testCard("source-master", "Source", "The Source"), raw: { nr: "1" } },
      { ...testCard("source-anomaly", "Source", "The anomaly"), keywords: ["anomaly", "distribution"], raw: {} },
      { ...testCard("structure-master", "Structure", "The Structure"), raw: { number: "2" } }
    ];

    expect(resolveScriptCard({ id: "source-master" }, cards)?.id).toBe("source-master");
    expect(resolveScriptCard({ domain: "Source", cardname: "The Source" }, cards)?.id).toBe("source-master");
    expect(resolveScriptCard({ domain: "Structure", nr: 2 }, cards)?.id).toBe("structure-master");
    expect(resolveScriptCard({
      domain: "Source",
      keywords: ["anomaly"],
      avoidMaster: true
    }, cards)?.id).toBe("source-anomaly");
    expect(resolveScriptCard({ domain: "Void", cardname: "Missing" }, cards)).toBeNull();
  });

  it("registers the two titled scripted example sessions", () => {
    expect(scriptedSessions.map((script) => script.title)).toEqual([
      "Sensor Calibration Review",
      "Business Strategy Abstraction"
    ]);
    expect(linearCalibrationScript.problemStatement).toContain("sensor calibration model");
    expect(scriptedSessions.find((script) => script.id === BUSINESS_STRATEGY_SCRIPT_ID)?.problemStatement)
      .toContain("finding more customers");

    for (const script of scriptedSessions) {
      expect(script.steps.length).toBeGreaterThan(8);
      expect(script.steps.some((step) => step.type === "add-note")).toBe(true);
      expect(script.steps.some((step) => step.type === "add-arrow")).toBe(true);
    }
  });

  it("starts each scripted example with problem/context notes before cards", () => {
    for (const script of scriptedSessions) {
      const firstContentSteps = script.steps.filter((step) => step.type !== "set-session-details").slice(0, 2);
      expect(firstContentSteps.map((step) => step.type)).toEqual(["add-note", "add-note"]);
      expect(firstContentSteps.map((step) => step.type === "add-note" ? step.text : "").join(" "))
        .toMatch(/Problem|Question|First/);
    }
  });

  it("keeps the business abstraction example to Aspect cards after setup notes", () => {
    const business = scriptedSessions.find((script) => script.id === BUSINESS_STRATEGY_SCRIPT_ID);
    expect(business?.modeStyle).toBe("Abstraction");
    const cardSteps = business?.steps.filter((step) => step.type === "place-card") ?? [];

    expect(cardSteps.length).toBeGreaterThanOrEqual(5);
    for (const step of cardSteps) {
      if (step.type !== "place-card") continue;
      expect(step.cardRef.domain).toBe("Aspect");
    }

    const cardStepIndexes = business?.steps
      .map((step, index) => ({ step, index }))
      .filter((entry) => entry.step.type === "place-card") ?? [];
    for (const { index } of cardStepIndexes) {
      expect(business?.steps.slice(index + 1).some((step) => step.type === "add-note")).toBe(true);
    }
  });

  it("uses object references for scripted arrows instead of only hardcoded coordinates", () => {
    for (const script of scriptedSessions) {
      const arrowSteps = script.steps.filter((step) => step.type === "add-arrow");
      expect(arrowSteps.length).toBeGreaterThan(0);
      for (const step of arrowSteps) {
        if (step.type !== "add-arrow") continue;
        expect(step.from).toBeTruthy();
        expect(step.to).toBeTruthy();
      }
    }
  });

  it("scripted demo recommendations advance and complete by step counter", () => {
    const start = scriptedDemoMode.recommendedAction?.(createSession());
    expect(start?.actionKind).toBe("script-step");
    expect(start?.mechanical).toContain("Set session");

    const complete = scriptedDemoMode.recommendedAction?.({
      ...createSession(),
      modeProgress: {
        "scripted-demo": {
          scriptId: linearCalibrationScript.id,
          stepIndex: linearCalibrationScript.steps.length
        }
      }
    });

    expect(complete?.actionKind).toBe("complete");
  });

  it("scripted note and arrow steps use normal reducer actions", () => {
    const withNote = sessionReducer(createSession(), {
      type: "note.create",
      x: 10,
      y: 20,
      text: "Script note",
      noteKind: "problem"
    });
    const withArrow = sessionReducer(withNote, {
      type: "arrow.create",
      x1: 10,
      y1: 20,
      x2: 30,
      y2: 40,
      label: "script arrow"
    });

    expect(withArrow.notes[0]).toMatchObject({ text: "Script note", noteKind: "problem" });
    expect(withArrow.arrows[0]).toMatchObject({ label: "script arrow", x1: 10, y2: 40 });
  });

  it("computes scripted domain placements inside topology regions", () => {
    for (const domain of ["Source", "Structure", "Chameleon", "Void", "Volition"] as const) {
      const card = testCard(`${domain.toLowerCase()}-card`, domain);
      const position = getDefaultScriptedPlacementForCard(card);
      expect(isPointInsideScriptedDomain(card, position.x, position.y)).toBe(true);
    }
  });

  it("places Aspect scripted modifiers near the latest non-Aspect target", () => {
    const source = testCard("source-card", "Source");
    const aspect = testCard("aspect-card", "Aspect");
    const sourcePosition = getDefaultScriptedPlacementForCard(source);
    const target = {
      ...placedCard(),
      cardId: source.id,
      x: sourcePosition.x,
      y: sourcePosition.y
    };
    const aspectPosition = getDefaultScriptedPlacementForCard(aspect, {
      placedCards: [target],
      cardsById: new Map([[source.id, source], [aspect.id, aspect]])
    });

    expect(aspectPosition.x).toBeGreaterThan(target.x);
    expect(Math.abs(aspectPosition.y - target.y)).toBeLessThan(40);
  });
});

describe("custom draw builder", () => {
  it("builds a combined two-per-domain candidate pool", () => {
    const cards = DOMAIN_ORDER.flatMap((domain) => [
      testCard(`${domain}-1`, domain, `${domain} 1`),
      testCard(`${domain}-2`, domain, `${domain} 2`),
      testCard(`${domain}-3`, domain, `${domain} 3`)
    ]);
    const candidates = buildCustomDrawCandidateRefs(
      makeTwoEachCanonicalRecipe(),
      cards,
      createDomainPiles(cards)
    );

    expect(candidates).toHaveLength(12);
    expect(DOMAIN_ORDER.map((domain) =>
      candidates.filter((candidate) => candidate.domain === domain).length
    )).toEqual([2, 2, 2, 2, 2, 2]);
  });
});

describe("pile context menus", () => {
  it("does not expose enabled no-op pile context menu leaves", () => {
    const cards = [
      testCard("source-a", "Source"),
      testCard("source-b", "Source", "Source B", "Elements")
    ];
    const piles = createDomainPiles(cards);
    const sourcePile = piles.find((pile) => pile.domain === "Source");
    expect(sourcePile).toBeTruthy();

    const callbacks = {
      promptForCount: () => 1,
      inspectPile: () => undefined,
      inspectDiscard: () => undefined,
      dispatchAction: () => undefined
    };

    expect(findEnabledNoopMenuItems(
      getDrawPileContextMenuItems(sourcePile!, cards, piles, callbacks)
    )).toEqual([]);
    expect(findEnabledNoopMenuItems(
      getDiscardPileContextMenuItems(sourcePile!, callbacks)
    )).toEqual([]);
  });
});

describe("game modes", () => {
  it("enriches Standard recommendation with unified step metadata", () => {
    const standard = gameModes.find((mode) => mode.id === "standard")!;
    const session = createSession();
    const recommendation = enrichModeRecommendation({
      mode: standard,
      recommendation: standard.recommendedAction!(session),
      session
    });

    expect(recommendation).toMatchObject({
      kind: "core",
      mechanical: "Draw 5 from Source, choose 1",
      interpretation: expect.stringContaining("Compare several candidates"),
      targetDomains: ["Source"]
    });
  });

  it("uses targetDomains for pile highlighting", () => {
    expect(getHighlightedDomainsForRecommendation({
      label: "Mixed",
      description: "Mixed",
      actionKind: "choose-filtered-candidates",
      targetDomains: ["Void", "Aspect"]
    })).toEqual(["Void", "Aspect"]);
  });

  it("has the fixed Next panel and demoted toolbar Actions control", () => {
    const nextPanel = fs.readFileSync(path.resolve("apps/web/src/ui/modes/NextActionPanel.tsx"), "utf8");
    const menuBar = fs.readFileSync(path.resolve("apps/web/src/ui/layout/MenuBar.tsx"), "utf8");
    const tableau = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/Tableau.tsx"), "utf8");
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(nextPanel).toContain("Mechanical:");
    expect(nextPanel).toContain("Interpretation:");
    expect(nextPanel).toContain("Mode:");
    expect(nextPanel).toContain('data-testid="next-action-panel"');
    expect(nextPanel).toContain('data-testid="next-panel-drag-handle"');
    expect(nextPanel).toContain('data-testid="next-panel-reset-position"');
    expect(nextPanel).toContain("onPointerDown={onDragStart}");
    expect(tableau).toContain("clampNextPanelPosition");
    expect(tableau).toContain("onNextPanelPositionChange");
    expect(tableau).toContain('data-testid="desk-viewport"');
    expect(tableau).toContain('data-testid="tableau-world"');
    expect(tableau).toContain('data-testid="desk-overlay-layer"');
    expect(tableau).toContain('data-testid="desk-overlay-next-panel"');
    expect(tableau).toContain("DomainPileBar");
    expect(tableau.indexOf("</TransformComponent>")).toBeLessThan(tableau.indexOf("desk-overlay-layer"));
    expect(tableau.indexOf("desk-overlay-layer")).toBeLessThan(tableau.indexOf("</TransformWrapper>"));
    expect(css).toContain(".desk-overlay-layer");
    expect(css).toContain("--z-desk-overlay: 300");
    expect(css).toContain("--z-dropdown: 1200");
    expect(css).toContain("width: clamp(320px, 34vw, 420px)");
    expect(css).toContain("min-height: 188px");
    expect(menuBar).toContain("actionsMenu");
  });

  it("keeps top menu dropdowns above desk overlays", () => {
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");
    const topMenuRule = css.match(/\.top-menu\s*\{[^}]+\}/)?.[0] ?? "";
    const fileMenuRule = css.match(/\.edit-menu-panel,\n\.file-menu-panel\s*\{[^}]+\}/)?.[0] ?? "";
    const deskOverlayRule = css.match(/\.desk-overlay-layer\s*\{[^}]+\}/)?.[0] ?? "";

    expect(topMenuRule).toContain("z-index: var(--z-top-menu)");
    expect(fileMenuRule).toContain("z-index: var(--z-dropdown)");
    expect(deskOverlayRule).toContain("z-index: var(--z-desk-overlay)");
  });

  it("defines a central mobile UI profile with minimal persistent overlays", () => {
    expect(getUiProfileForWidth(768)).toBe("mobile");
    expect(getUiProfileForWidth(769)).toBe("desktop");
    expect(getUiConfig("mobile")).toBe(mobileUiConfig);
    expect(getUiConfig("desktop")).toBe(desktopUiConfig);

    expect(mobileUiConfig.hideMinimap).toBe(true);
    expect(mobileUiConfig.compactNextPanel).toBe(true);
    expect(mobileUiConfig.showOnlyResetView).toBe(true);
    expect(mobileUiConfig.hideBookmarks).toBe(true);
    expect(mobileUiConfig.hideFitButtons).toBe(true);
    expect(mobileUiConfig.hideZoomButtons).toBe(true);
    expect(mobileUiConfig.collapsePiles).toBe(true);
    expect(mobileUiConfig.showMobilePileDrawer).toBe(true);
    expect(mobileUiConfig.collapseCardBrowser).toBe(true);
    expect(mobileUiConfig.hideDeveloperPanel).toBe(true);
    expect(mobileUiConfig.hideCustomAssets).toBe(true);
    expect(mobileUiConfig.showMobileActionBar).toBe(true);
  });

  it("wires mobile profile controls without changing desktop defaults", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
    const tableau = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/Tableau.tsx"), "utf8");
    const navigation = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/TableauNavigationControls.tsx"), "utf8");
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(appSource).toContain("useUiProfile()");
    expect(appSource).toContain("collapseCardBrowser");
    expect(appSource).toContain("hideCustomAssets");
    expect(appSource).toContain("uiConfig={uiProfile.config}");
    expect(tableau).toContain("!uiConfig?.hideMinimap");
    expect(tableau).toContain("!uiConfig?.collapsePiles");
    expect(tableau).toContain("showMobilePileDrawer");
    expect(tableau).toContain('data-testid="mobile-action-bar"');
    expect(tableau).toContain('data-testid="mobile-pile-drawer-expand"');
    expect(tableau).toContain('data-testid="mobile-pile-drawer-collapse"');
    expect(tableau).toContain("MobileActionBar");
    expect(navigation).toContain("showOnlyResetView");
    expect(navigation).toContain("!uiConfig?.hideBookmarks");
    expect(navigation).toContain("!uiConfig?.hideFitButtons");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain(".ui-mobile .desk-overlay-bottom-right");
    expect(css).toContain(".ui-mobile .top-actions");
    expect(css).toContain("top: max(8px, env(safe-area-inset-top))");
    expect(css).toContain(".mobile-action-bar");
    expect(css).toContain(".mobile-action-bar .mobile-action-primary");
    expect(css).toContain(".mobile-pile-drawer .domain-pile-scroll");
  });

  it("keeps mobile card assets on resolved preview URLs", () => {
    const cardView = fs.readFileSync(path.resolve("apps/web/src/ui/cards/CardView.tsx"), "utf8");
    const assetResolution = fs.readFileSync(path.resolve("apps/web/src/ui/cards/cardAssetResolution.ts"), "utf8");
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(cardView).toContain('getCardFrontPreview(card, "desk")');
    expect(cardView).toContain('getCardBackPreview(card, "desk")');
    expect(cardView).toContain("PreviewImage");
    expect(cardView).toContain("onError");
    expect(cardView).toContain("getCardFrontThumbnail(card)");
    expect(cardView).toContain("getCardBackThumbnail(card)");
    expect(cardView).not.toContain("src={pdfPath}");
    expect(assetResolution).toContain("getCardFrontPreview");
    expect(assetResolution).toContain("getCardBackPreview");
    expect(assetResolution).toContain("getCardArtImage");
    expect(css).not.toContain(".ui-mobile .tableau-card img {\n    display: none");
  });

  it("renders mobile context menus as a drill-down action sheet", () => {
    const contextMenu = fs.readFileSync(path.resolve("apps/web/src/ui/context-menu/ContextMenu.tsx"), "utf8");
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(contextMenu).toContain("useUiProfile");
    expect(contextMenu).toContain("MobileContextMenuSheet");
    expect(contextMenu).toContain('data-testid="mobile-context-menu-sheet"');
    expect(contextMenu).toContain('data-testid="mobile-context-menu-back"');
    expect(contextMenu).toContain('data-testid="mobile-context-menu-close"');
    expect(contextMenu).toContain("onOpenChildren");
    expect(css).toContain(".mobile-context-menu-sheet");
    expect(css).toContain("max-height: min(80vh, 620px)");
    expect(css).toContain(".mobile-context-menu-list");
    expect(css).not.toContain(".mobile-context-menu-submenu-panel");
  });

  it("suppresses the introductory session wizard on mobile only", () => {
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(appSource).toContain("if (startupIntroOpen) return;");
    expect(appSource).toContain("if (uiProfile.isMobile) return;");
    expect(appSource).toContain("setNewSessionWizardOpen(true)");
    expect(appSource).toContain("suppressStartupFlowAfterIntroHelpRef.current = false;");
    expect(appSource).toContain("setStartupIntroOpen(false);");
    expect(appSource).toContain("[startupIntroOpen, uiProfile.isMobile]");
  });

  it("uses a closer camera fit for desktop reading zoom without changing card scale", () => {
    const tableau = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/Tableau.tsx"), "utf8");

    expect(tableau).toContain("computeCardBounds(placed)");
    expect(tableau).toContain("padding: 10");
    expect(tableau).toContain("fill: 0.88");
    expect(tableau).toContain("maxScale: 6");
    expect(tableau).not.toContain("type: \"card.setScale\"");
  });

  it("exposes persistent desk navigation and overlay scale controls", () => {
    const navigation = fs.readFileSync(path.resolve("apps/web/src/ui/tableau/TableauNavigationControls.tsx"), "utf8");
    const pileBar = fs.readFileSync(path.resolve("apps/web/src/ui/piles/DomainPileBar.tsx"), "utf8");
    const choiceModal = fs.readFileSync(path.resolve("apps/web/src/ui/draw/DrawChoiceModal.tsx"), "utf8");

    expect(navigation).toContain('data-testid="desk-navigation-controls"');
    expect(navigation).toContain('data-testid="center-view-button"');
    expect(navigation).toContain('data-testid="reset-view-button"');
    expect(navigation).toContain('data-testid="fit-board-button"');
    expect(pileBar).toContain('data-testid="pile-overlay"');
    expect(pileBar).toContain('data-testid="pile-scale-increase"');
    expect(pileBar).toContain('data-testid="pile-scale-decrease"');
    expect(choiceModal).toContain('data-testid="choice-scale-increase"');
    expect(choiceModal).toContain('data-testid="choice-scale-decrease"');
    expect(choiceModal).toContain("--choice-card-width");
    expect(choiceModal).toContain("--choice-modal-width");
  });

  it("lets the pile overlay grow and wrap instead of scrolling horizontally", () => {
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");
    const pileBarRule = css.match(/\.domain-pile-bar\s*\{[^}]+\}/)?.[0] ?? "";
    const pileGroupRule = css.match(/\.domain-pile-scroll\s*\{[^}]+\}/)?.[0] ?? "";

    expect(pileBarRule).toContain("width: max-content");
    expect(pileBarRule).toContain("overflow: visible");
    expect(pileGroupRule).toContain("flex-wrap: wrap");
    expect(pileGroupRule).toContain("overflow-x: visible");
    expect(pileGroupRule).not.toContain("overflow-x: auto");
  });

  it("anchors scale controls at the top-left of pile and choice panels", () => {
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");
    const pileBar = fs.readFileSync(path.resolve("apps/web/src/ui/piles/DomainPileBar.tsx"), "utf8");
    const choiceModal = fs.readFileSync(path.resolve("apps/web/src/ui/draw/DrawChoiceModal.tsx"), "utf8");
    const pileHeaderRule = css.match(/\.pile-overlay-header\s*\{[^}]+\}/)?.[0] ?? "";
    const choiceBackdropRule = css.match(/\.draw-choice-backdrop\s*\{[^}]+\}/)?.[0] ?? "";
    const choiceGridRule = css.match(/\.draw-choice-grid\s*\{[^}]+\}/)?.[0] ?? "";

    expect(pileHeaderRule).toContain("justify-content: flex-start");
    expect(pileBar.indexOf("overlay-scale-controls")).toBeLessThan(pileBar.indexOf("<span>Piles</span>"));
    expect(choiceModal.indexOf("overlay-scale-controls")).toBeLessThan(choiceModal.indexOf("<h2>"));
    expect(choiceBackdropRule).toContain("justify-items: start");
    expect(choiceGridRule).toContain("grid-template-columns: repeat(auto-fit, var(--choice-card-width))");
  });

  it("places mode AI recommendation above active details and keeps selected highlighting", () => {
    const modePanel = fs.readFileSync(path.resolve("apps/web/src/ui/modes/ModePanel.tsx"), "utf8");
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(modePanel).toContain('data-testid="mode-ai-recommend-button"');
    expect(modePanel).toContain("mode-active-summary selected");
    expect(modePanel.indexOf("mode-ai-recommend-callout mode-list-top-action")).toBeLessThan(
      modePanel.indexOf('data-testid="active-mode-summary"')
    );
    expect(modePanel.indexOf("mode-ai-recommend-callout mode-list-top-action")).toBeLessThan(
      modePanel.indexOf("<ModeList")
    );
    expect(modePanel.indexOf('data-testid="mode-ai-recommend-button"')).toBeLessThan(
      modePanel.indexOf("Recommended action")
    );
    expect(appSource).toContain('mode: { title: "Game Mode", x: 220, y: 50, width: 980, height: 840');
  });

  it("assigns expected category tint classes", () => {
    const css = fs.readFileSync(path.resolve("apps/web/src/style.css"), "utf8");

    expect(css).toContain(".mode-category-source-abstraction");
    expect(css).toContain("--mode-category-color: #77c887");
    expect(css).toContain(".mode-category-model-diagnosis");
    expect(css).toContain("--mode-category-color: #b28cff");
    expect(css).toContain(".mode-active-summary");
  });

  it("registers the next handbook modes with app-facing content", () => {
    for (const id of [
      "source-review",
      "abstraction",
      "true-bayes",
      "shadows-vacuum",
      "everything-not",
      "void-cartography",
      "ablation-study",
      "model-archaeology",
      "model-lies",
      "model-dies",
      "inheritance",
      "entropy-auction",
      "own-worst-enemy",
      "midnight-calibration",
      "exam-clock",
      "painters-trace",
      "bench-and-forest",
      "landscape",
      "walk-in-the-park"
    ]) {
      const mode = gameModes.find((candidate) => candidate.id === id);

      expect(mode).toBeTruthy();
      expect(mode?.name).toBeTruthy();
      expect(mode?.purpose).toBeTruthy();
      expect(mode?.setupInstructions.length).toBeGreaterThan(0);
      expect(mode?.domainVector).toBeTruthy();
      expect(mode?.procedureSummary).toBeTruthy();
      expect(mode?.automationStatus).toBeTruthy();
    }
  });

  it("assigns every built-in mode to exactly one category", () => {
    const groupedModes = groupModesByCategory(gameModes);
    const groupedIds = groupedModes.flatMap((group) => group.modes.map((mode) => mode.id));
    const uniqueIds = new Set(groupedIds);

    expect(groupedIds).toHaveLength(gameModes.length);
    expect(uniqueIds.size).toBe(gameModes.length);
    for (const mode of gameModes) {
      expect(mode.category).toBeTruthy();
      expect(groupedIds).toContain(mode.id);
    }
  });

  it("gives every public mode complete app-facing metadata", () => {
    for (const mode of gameModes) {
      expect(mode.id).toBeTruthy();
      expect(mode.name).toBeTruthy();
      expect(mode.purpose).toBeTruthy();
      expect(mode.setupInstructions.length).toBeGreaterThan(0);
      expect(mode.domainVector).toBeTruthy();
      expect(Object.keys(mode.domainVector).length).toBeGreaterThan(0);
      expect(mode.procedureSummary).toBeTruthy();
      expect(mode.category).toBeTruthy();
    }
  });

  it("keeps expected handbook mode categories", () => {
    const categoryById = new Map(
      MODE_CATEGORIES.flatMap((category) =>
        category.modeIds.map((modeId) => [modeId, category.label] as const)
      )
    );

    expect(categoryById.get("free")).toBe("Free");
    expect(categoryById.get("minimalism")).toBe("Free");
    expect(categoryById.get("scripted-demo")).toBe("Recommended");
    expect(categoryById.get("true-bayes")).toBe("Core / guided");
    expect(categoryById.get("source-review")).toBe("Source / abstraction");
    expect(categoryById.get("void-cartography")).toBe("Void / alternatives");
    expect(categoryById.get("ablation-study")).toBe("Model diagnosis");
    expect(categoryById.get("model-archaeology")).toBe("Model diagnosis");
    expect(categoryById.get("model-lies")).toBe("Model diagnosis");
    expect(categoryById.get("model-dies")).toBe("Model diagnosis");
    expect(categoryById.get("exam-clock")).toBe("Volition / social / pressure");
    expect(categoryById.get("inheritance")).toBe("Volition / social / pressure");
    expect(categoryById.get("bench-and-forest")).toBe("Creative / outdoor / spatial");
    expect(categoryById.get("walk-in-the-park")).toBe("Creative / outdoor / spatial");
    expect(categoryById.get("landscape")).toBe("Creative / outdoor / spatial");
  });

  it("flags physical cards for creative spatial outdoor modes", () => {
    for (const modeId of ["painters-trace", "bench-and-forest", "landscape", "walk-in-the-park"]) {
      const mode = gameModes.find((candidate) => candidate.id === modeId);
      const text = [mode?.description, mode?.commentary, mode?.procedureSummary].join(" ");
      expect(text).toContain("Works especially well with physical cards / physical surroundings");
    }
  });

  it("promotes Standard and Abstraction into the top recommended section", () => {
    expect(gameModes[0]?.id).toBe("standard");
    expect(MODE_CATEGORIES[0]).toMatchObject({
      id: "recommended",
      label: "Recommended",
      modeIds: ["standard", "abstraction", "scripted-demo"]
    });
    expect(MODE_CATEGORIES.find((category) => category.id === "core")?.modeIds).not.toContain("standard");
    expect(MODE_CATEGORIES.find((category) => category.id === "source-abstraction")?.modeIds).not.toContain("abstraction");
    expect(MODE_CATEGORIES.find((category) => category.id === "free")?.modeIds).toEqual(["free", "minimalism"]);
    expect(MODE_CATEGORIES.find((category) => category.id === "core")?.modeIds).not.toContain("minimalism");
    expect(groupModesByCategory(gameModes)[0].modes.map((mode) => mode.id)).toEqual([
      "standard",
      "abstraction",
      "scripted-demo"
    ]);
  });

  it("exposes scripted example choices from the mode list", () => {
    const modeList = fs.readFileSync(path.resolve("apps/web/src/ui/modes/ModeList.tsx"), "utf8");
    const appSource = fs.readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");

    expect(modeList).toContain("mode-list-example-sessions");
    expect(modeList).toContain("scriptedSessions.map");
    expect(modeList).toContain("onLoadExampleSession(script.id)");
    expect(appSource).toContain("onLoadExampleSession={loadExampleSession}");
  });

  it("continues Minimalism from domain masters into subdomain master cards", () => {
    const cards = makeMinimalismCards();
    const session = {
      ...createSession(),
      piles: createDomainPiles(cards)
    };
    const first = getMinimalismRecommendation(session, cards);

    expect(first?.actionKind).toBe("place-domain-masters");

    const withDomainMasters = sessionReducer(session, {
      type: "draw.placeFilteredCards",
      cards: cards.filter((card) => card.cardname.startsWith("The ")).map((card) => ({
        cardId: card.id,
        domain: card.domain
      }))
    });
    const source = getMinimalismRecommendation(withDomainMasters, cards);

    expect(source).toMatchObject({
      actionKind: "draw-specific",
      domain: "Source",
      cardId: "source-observation"
    });

    const withSourceSubdomain = sessionReducer(withDomainMasters, {
      type: "pile.drawSpecificCard",
      domain: source!.domain!,
      cardId: source!.cardId!
    });
    const structure = getMinimalismRecommendation(withSourceSubdomain, cards);

    expect(structure).toMatchObject({
      actionKind: "draw-specific",
      domain: "Structure",
      cardId: "structure-assumption"
    });
    expect(cards.find((card) => card.id === structure?.cardId)?.cardname).not.toBe("Ordinary Structure");
  });

  it("skips exhausted Minimalism domains and completes after subdomain masters", () => {
    const cards = makeMinimalismCards();
    const base = sessionReducer({
      ...createSession(),
      piles: createDomainPiles(cards)
    }, {
      type: "draw.placeFilteredCards",
      cards: cards.filter((card) => card.cardname.startsWith("The ")).map((card) => ({
        cardId: card.id,
        domain: card.domain
      }))
    });
    const skipped = getMinimalismRecommendation(
      base,
      cards.filter((card) => card.id !== "source-observation")
    );

    expect(skipped).toMatchObject({
      actionKind: "draw-specific",
      domain: "Structure"
    });

    const complete = sessionReducer(base, {
      type: "draw.placeFilteredCards",
      cards: cards
        .filter((card) => card.subdomain && !card.cardname.startsWith("The ") && !card.id.endsWith("-ordinary"))
        .map((card) => ({ cardId: card.id, domain: card.domain }))
    });

    expect(getMinimalismRecommendation(complete, cards)).toMatchObject({
      actionKind: "complete"
    });
  });

  it("removes Reverse Auction from the public registry", () => {
    expect(gameModes.some((mode) => mode.id === "reverse-auction")).toBe(false);
    expect(MODE_CATEGORIES.some((category) => category.modeIds.includes("reverse-auction"))).toBe(false);
  });

  it("does not expose partial or description-only mode badges", () => {
    for (const mode of gameModes) {
      expect(mode.automationStatus).not.toBe("partial");
      expect(mode.automationStatus).not.toBe("description-only");
    }

    const modeListSource = fs.readFileSync(path.resolve("apps/web/src/ui/modes/ModeList.tsx"), "utf8");
    const modePanelSource = fs.readFileSync(path.resolve("apps/web/src/ui/modes/ModePanel.tsx"), "utf8");
    expect(modeListSource).not.toContain("automationStatus");
    expect(modePanelSource).not.toContain("Automation:");
  });

  it("does not expose internal handbook wording in mode descriptions", () => {
    for (const mode of gameModes) {
      const text = [
        mode.purpose,
        mode.shortDescription,
        mode.whenToUse,
        mode.procedureSummary,
        mode.commentary,
        mode.description,
        ...mode.setupInstructions
      ].filter(Boolean).join("\n");

      expect(text).not.toMatch(/Handbook vector|Commentary:/i);
    }
  });

  it("does not expose the unfinished new custom mode button", () => {
    const modePanelSource = fs.readFileSync(path.resolve("apps/web/src/ui/modes/ModePanel.tsx"), "utf8");

    expect(modePanelSource).not.toContain("New custom mode");
  });

  it("runs Source Review through Source setup, Aspect masters, ordinary Aspect, and complete", () => {
    const mode = gameModes.find((candidate) => candidate.id === "source-review");
    const cards = [
      testCard("source-domain", "Source", "The Source"),
      testCard("source-elements", "Source", "Elements", "Elements"),
      testCard("source-people", "Source", "The People", "Elements"),
      testCard("aspect-domain", "Aspect", "The Aspect"),
      testCard("aspect-operators", "Aspect", "Operators", "Operators"),
      testCard("aspect-detail", "Aspect", "Angle", "Operators")
    ];
    const initial = { ...createSession(), piles: createDomainPiles(cards) };

    expect(getSourceReviewPhase(initial, cards)).toBe("place-source-masters");
    expect(mode?.recommendedAction?.(initial, cards)).toMatchObject({
      actionKind: "place-cards",
      domain: "Source",
      cards: [
        { cardId: "source-domain", domain: "Source" },
        { cardId: "source-elements", domain: "Source" }
      ]
    });

    const afterSourceSetup = {
      ...initial,
      tableau: [
        { ...placedCard(), cardId: "source-domain" },
        { ...placedCard(), instanceId: "source-elements-instance", cardId: "source-elements" }
      ]
    };

    expect(getSourceReviewPhase(afterSourceSetup, cards)).toBe("draw-aspect-masters");
    const aspectMasterRecommendation = mode?.recommendedAction?.(afterSourceSetup, cards);
    expect(aspectMasterRecommendation).toMatchObject({
      actionKind: "draw-specific",
      domain: "Aspect"
    });
    expect(["aspect-domain", "aspect-operators"]).toContain(aspectMasterRecommendation?.cardId);

    const afterAspectMasters = {
      ...afterSourceSetup,
      piles: afterSourceSetup.piles.map((pile) =>
        pile.domain === "Aspect"
          ? {
              ...pile,
              currentOrder: ["aspect-detail"],
              drawnCardIds: ["aspect-domain", "aspect-operators"]
            }
          : pile
      )
    };

    expect(getSourceReviewPhase(afterAspectMasters, cards)).toBe("draw-aspect-ordinary");
    expect(mode?.recommendedAction?.(afterAspectMasters, cards)).toMatchObject({
      actionKind: "draw-specific",
      domain: "Aspect",
      cardId: "aspect-detail"
    });

    const complete = {
      ...afterAspectMasters,
      piles: afterAspectMasters.piles.map((pile) =>
        pile.domain === "Aspect" ? { ...pile, currentOrder: [] } : pile
      )
    };

    expect(getSourceReviewPhase(complete, cards)).toBe("complete");
    expect(mode?.recommendedAction?.(complete, cards)).toMatchObject({
      actionKind: "complete"
    });
  });

  it("defines True Bayes as random all-domain brainstorm", () => {
    const mode = gameModes.find((candidate) => candidate.id === "true-bayes");
    expect(mode?.domainVector).toMatchObject({
      Source: "R",
      Structure: "R",
      Chameleon: "R",
      Void: "R",
      Volition: "R",
      Aspect: "R"
    });

    expect(mode?.recommendedAction?.(createSession())).toMatchObject({
      actionKind: "start-timer",
      timerPreset: {
        durationMs: 20000,
        actionOnFinish: "next",
        autoRestart: true
      },
      progressUpdates: { timerStarted: true }
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      modeProgress: { "true-bayes": { timerStarted: true } }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Source"
    });
  });

  it("uses Standard as the default and first public mode", () => {
    expect(DEFAULT_MODE_ID).toBe("standard");
    expect(createSession().activeModeId).toBe(DEFAULT_MODE_ID);
    expect(gameModes[0]?.id).toBe(DEFAULT_MODE_ID);
    expect(gameModes[1]?.id).toBe("free");
  });

  it("defines model diagnosis modes with non-crashing recommendations", () => {
    const expectations = [
      ["model-archaeology", { Source: "F", Structure: "C", Chameleon: "C", Void: "C", Volition: "C", Aspect: "R" }],
      ["model-lies", { Source: "R", Structure: "F", Chameleon: "F", Void: "R", Volition: "R", Aspect: "R" }],
      ["model-dies", { Source: "C", Structure: "F", Chameleon: "F", Void: "C", Volition: "C", Aspect: "A" }]
    ] as const;

    for (const [id, vector] of expectations) {
      const mode = gameModes.find((candidate) => candidate.id === id);
      expect(mode?.domainVector).toMatchObject(vector);
      expect(() => mode?.recommendedAction?.(createSession())).not.toThrow();
      expect(mode?.recommendedAction?.(createSession())).toBeTruthy();
    }
  });

  it("targets Aspect for Abstraction recommendations", () => {
    const abstraction = gameModes.find((mode) => mode.id === "abstraction");
    const recommendation = abstraction?.recommendedAction?.(createSession());

    expect(recommendation).toMatchObject({
      actionKind: "create-note"
    });

    expect(abstraction?.recommendedAction?.({
      ...createSession(),
      modeProgress: { abstraction: { topicNotePlaced: true } }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Aspect"
    });
  });

  it("defines Shadows & Vacuum as fixed Source and chosen Void", () => {
    const mode = gameModes.find((candidate) => candidate.id === "shadows-vacuum");
    expect(mode?.domainVector).toMatchObject({
      Source: "F",
      Structure: "A",
      Chameleon: "A",
      Void: "C",
      Volition: "A",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Structure", "Aspect", "Void"],
      index: 0
    })).toBe("Void");
  });

  it("progresses Shadows & Vacuum from Source setup to Source choice to Void choose-1-of-5", () => {
    const mode = gameModes.find((candidate) => candidate.id === "shadows-vacuum");
    const cards = [testCard("source-master", "Source"), testCard("void-a", "Void")];
    const piles = createDomainPiles(cards);
    const initial = { ...createSession(), piles };
    const setupRecommendation = mode?.recommendedAction?.(initial);

    expect(setupRecommendation).toMatchObject({
      actionKind: "place-domain-masters",
      domains: ["Source"]
    });

    const afterSetup = {
      ...initial,
      tableau: [{
        ...placedCard(),
        cardId: "source-master"
      }]
    };

    expect(mode?.recommendedAction?.(afterSetup)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Source",
      progressUpdates: { sourceChoiceDone: true }
    });

    expect(mode?.recommendedAction?.({
      ...afterSetup,
      modeProgress: {
        "shadows-vacuum": { sourceChoiceDone: true }
      }
    })).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Void",
      count: 5
    });
  });

  it("defines Everything Not as fixed Structure/Chameleon and random Void", () => {
    const mode = gameModes.find((candidate) => candidate.id === "everything-not");
    expect(mode?.domainVector).toMatchObject({
      Source: "A",
      Structure: "F",
      Chameleon: "F",
      Void: "R",
      Volition: "A",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Aspect", "Source", "Void"],
      index: 0
    })).toBe("Void");
  });

  it("progresses Everything Not from masters to Structure choice to Chameleon choice to Void", () => {
    const mode = gameModes.find((candidate) => candidate.id === "everything-not");
    const cards = [
      testCard("structure-master", "Structure"),
      testCard("chameleon-master", "Chameleon"),
      testCard("void-a", "Void")
    ];
    const piles = createDomainPiles(cards);
    const initial = { ...createSession(), piles };

    expect(mode?.recommendedAction?.(initial, cards)).toMatchObject({
      actionKind: "place-domain-masters",
      domains: ["Structure", "Chameleon"]
    });

    const afterSetup = {
      ...initial,
      tableau: [
        { ...placedCard(), cardId: "structure-master" },
        { ...placedCard(), instanceId: "chameleon-instance", cardId: "chameleon-master" }
      ]
    };

    expect(mode?.recommendedAction?.(afterSetup)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Structure",
      progressUpdates: { structureChoiceDone: true }
    });

    const afterStructureChoice = {
      ...afterSetup,
      modeProgress: {
        "everything-not": { structureChoiceDone: true }
      }
    };

    expect(mode?.recommendedAction?.(afterStructureChoice)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Chameleon",
      progressUpdates: { chameleonChoiceDone: true }
    });

    expect(mode?.recommendedAction?.({
      ...afterStructureChoice,
      modeProgress: {
        "everything-not": { structureChoiceDone: true, chameleonChoiceDone: true }
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Void"
    });
  });

  it("defines Void Cartography as restricted Void and Aspect only", () => {
    const mode = gameModes.find((candidate) => candidate.id === "void-cartography");
    expect(mode?.domainVector).toMatchObject({
      Source: "A",
      Structure: "A",
      Chameleon: "A",
      Void: "R",
      Volition: "A",
      Aspect: "R"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Source", "Structure", "Chameleon", "Volition"],
      index: 0
    }, ["R"])).toBe("");
  });

  it("alternates Void Cartography between restricted Void candidates and Aspect candidates", () => {
    const mode = gameModes.find((candidate) => candidate.id === "void-cartography");
    const cards = [
      testCard("void-geometry", "Void", "Void Geometry A", "Void Geometry"),
      testCard("void-dynamics", "Void", "Void Dynamics A", "Void Dynamics"),
      testCard("void-other", "Void", "Void Other", "Other"),
      testCard("no-thought", "Void", "No Thought Geometry Decoy", "Absence"),
      testCard("aspect-a", "Aspect"),
      testCard("aspect-b", "Aspect")
    ];
    const piles = createDomainPiles(cards);
    const initial = { ...createSession(), piles };

    const voidRecommendation = mode?.recommendedAction?.(initial, cards);
    expect(voidRecommendation).toMatchObject({
      actionKind: "choose-filtered-candidates",
      domain: "Void",
      progressUpdates: { step: 1 }
    });
    expect(voidRecommendation?.cards?.map((card) => card.cardId).sort()).toEqual([
      "void-dynamics",
      "void-geometry"
    ]);

    const aspectRecommendation = mode?.recommendedAction?.({
      ...initial,
      modeProgress: { "void-cartography": { step: 1 } }
    }, cards);
    expect(aspectRecommendation).toMatchObject({
      actionKind: "choose-filtered-candidates",
      domain: "Aspect",
      progressUpdates: { step: 2 }
    });
    expect(aspectRecommendation?.cards?.map((card) => card.cardId).sort()).toEqual([
      "aspect-a",
      "aspect-b"
    ]);
  });

  it("defines Ablation Study as fixed Source/Structure/Chameleon only", () => {
    const mode = gameModes.find((candidate) => candidate.id === "ablation-study");
    expect(mode?.domainVector).toMatchObject({
      Source: "F",
      Structure: "F",
      Chameleon: "F",
      Void: "A",
      Volition: "A",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Void", "Volition", "Aspect"],
      index: 0
    })).toBe("");
  });

  it("recommends Ablation Study fixed setup before review", () => {
    const mode = gameModes.find((candidate) => candidate.id === "ablation-study");
    const cards = [
      testCard("source-master", "Source"),
      testCard("structure-master", "Structure"),
      testCard("chameleon-master", "Chameleon")
    ];
    const piles = createDomainPiles(cards);
    const initial = { ...createSession(), piles };

    expect(mode?.recommendedAction?.(initial)).toMatchObject({
      actionKind: "place-domain-masters",
      domains: ["Source"]
    });

    const afterSource = {
      ...initial,
      tableau: [{ ...placedCard(), cardId: "source-master" }]
    };

    expect(mode?.recommendedAction?.(afterSource)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Source",
      progressUpdates: { reviewedSourceCards: true }
    });

    const afterSourceReview = {
      ...initial,
      tableau: [{ ...placedCard(), cardId: "source-master" }],
      modeProgress: {
        "ablation-study": { reviewedSourceCards: true }
      }
    };

    expect(mode?.recommendedAction?.(afterSourceReview)).toMatchObject({
      actionKind: "place-domain-masters",
      domains: ["Structure", "Chameleon"]
    });

    const afterCore = {
      ...afterSourceReview,
      tableau: [
        { ...placedCard(), cardId: "source-master" },
        { ...placedCard(), instanceId: "structure-instance", cardId: "structure-master" },
        { ...placedCard(), instanceId: "chameleon-instance", cardId: "chameleon-master" }
      ],
      modeProgress: {
        "ablation-study": { reviewedSourceCards: true }
      }
    };

    expect(mode?.recommendedAction?.(afterCore)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Chameleon",
      label: "Review Chameleon cards"
    });

    expect(mode?.recommendedAction?.({
      ...afterCore,
      modeProgress: {
        "ablation-study": { reviewedSourceCards: true, reviewedChameleonCards: true }
      }
    })).toMatchObject({
      actionKind: "complete",
      label: "Mark cards as ablated/destroyed"
    });
  });

  it("defines Inheritance as Volition chosen and targets Volition", () => {
    const mode = gameModes.find((candidate) => candidate.id === "inheritance");
    expect(mode?.domainVector).toMatchObject({
      Source: "A",
      Structure: "A",
      Chameleon: "A",
      Void: "A",
      Volition: "C",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Source", "Volition", "Aspect"],
      index: 0
    })).toBe("Volition");
    expect(mode?.recommendedAction?.(createSession())).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Volition"
    });
  });

  it("defines Entropy Auction as all-random candidate workflow", () => {
    const mode = gameModes.find((candidate) => candidate.id === "entropy-auction");
    const cards = DOMAIN_ORDER.flatMap((domain) => [
      testCard(`${domain}-1`, domain, `${domain} 1`),
      testCard(`${domain}-2`, domain, `${domain} 2`),
      testCard(`${domain}-3`, domain, `${domain} 3`)
    ]);
    const session = {
      ...createSession(),
      piles: createDomainPiles(cards)
    };
    expect(mode?.domainVector).toMatchObject({
      Source: "R",
      Structure: "R",
      Chameleon: "R",
      Void: "R",
      Volition: "R",
      Aspect: "R"
    });
    const recommendation = mode?.recommendedAction?.(session, cards);
    expect(recommendation).toMatchObject({
      actionKind: "choose-filtered-candidates",
      domain: "Mixed",
      count: 12
    });
    expect(recommendation?.cards).toHaveLength(12);
    expect(DOMAIN_ORDER.map((domain) =>
      recommendation?.cards?.filter((card) => card.domain === domain).length
    )).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("choosing an Entropy Auction candidate discards unchosen cards to their source piles", () => {
    const cards = DOMAIN_ORDER.flatMap((domain) => [
      testCard(`${domain}-1`, domain, `${domain} 1`),
      testCard(`${domain}-2`, domain, `${domain} 2`)
    ]);
    const entropy = gameModes.find((candidate) => candidate.id === "entropy-auction");
    const session = {
      ...createSession(),
      piles: createDomainPiles(cards)
    };
    const recommendation = entropy?.recommendedAction?.(session, cards);
    expect(recommendation?.cards).toHaveLength(12);

    const withChoice = sessionReducer(session, {
      type: "draw.startFilteredChoice",
      cards: recommendation!.cards!
    });
    const chosen = recommendation!.cards![0];
    const afterChoose = sessionReducer(withChoice, {
      type: "pile.chooseCandidate",
      cardId: chosen.cardId
    });

    expect(afterChoose.tableau[0].cardId).toBe(chosen.cardId);
    expect(afterChoose.piles.find((pile) => pile.domain === "Structure")?.discardCardIds.toSorted()).toEqual([
      "Structure-1",
      "Structure-2"
    ]);
    expect(afterChoose.log.at(-1)?.details).toMatchObject({
      chosenCardId: chosen.cardId
    });
  });

  it("defines Own Worst Enemy and alternates pro/anti recommendations", () => {
    const mode = gameModes.find((candidate) => candidate.id === "own-worst-enemy");
    expect(mode?.domainVector).toMatchObject({
      Source: "F",
      Structure: "C",
      Chameleon: "C",
      Void: "A",
      Volition: "C",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Void", "Aspect", "Structure"],
      index: 0
    })).toBe("Structure");

    const cards = [
      testCard("source-master", "Source"),
      testCard("structure-a", "Structure"),
      testCard("chameleon-a", "Chameleon"),
      testCard("volition-a", "Volition")
    ];
    const initial = { ...createSession(), piles: createDomainPiles(cards) };
    expect(mode?.recommendedAction?.(initial)).toMatchObject({
      actionKind: "place-domain-masters",
      domains: ["Source"]
    });

    const afterSource = {
      ...initial,
      tableau: [{ ...placedCard(), cardId: "source-master" }]
    };
    expect(mode?.recommendedAction?.(afterSource)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Source"
    });

    const afterSourceChoice = {
      ...afterSource,
      modeProgress: {
        "own-worst-enemy": { sourceChoiceDone: true }
      }
    };
    expect(mode?.recommendedAction?.(afterSourceChoice)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Structure",
      label: "Pro stance: choose Structure card",
      progressUpdates: { step: 1, stance: "anti" }
    });

    expect(mode?.recommendedAction?.({
      ...afterSource,
      modeProgress: {
        "own-worst-enemy": { sourceChoiceDone: true, step: 1, stance: "anti" }
      }
    })).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Chameleon",
      label: "Anti stance: choose Chameleon card",
      progressUpdates: { step: 2, stance: "pro" }
    });
  });

  it("defines Midnight Calibration as all-random domain pairs", () => {
    const mode = gameModes.find((candidate) => candidate.id === "midnight-calibration");
    expect(mode?.domainVector).toMatchObject({
      Source: "R",
      Structure: "R",
      Chameleon: "R",
      Void: "R",
      Volition: "R",
      Aspect: "R"
    });

    const cards = [
      testCard("source-a", "Source"),
      testCard("source-b", "Source"),
      testCard("structure-a", "Structure"),
      testCard("structure-b", "Structure")
    ];
    const initial = {
      ...createSession(),
      piles: createDomainPiles(cards)
    };
    const sourcePairRecommendation = mode?.recommendedAction?.(initial);
    expect(sourcePairRecommendation).toMatchObject({
      actionKind: "place-cards",
      domain: "Source",
      progressUpdates: { step: 1, lastDomain: "Source", interpretedPosition: expect.any(String) }
    });
    expect(sourcePairRecommendation?.cards).toHaveLength(2);
    expect(sourcePairRecommendation?.cards?.map((card) => card.domain)).toEqual(["Source", "Source"]);
    expect(sourcePairRecommendation?.cards?.map((card) => card.cardId).sort()).toEqual(["source-a", "source-b"]);
    expect(sourcePairRecommendation?.cards?.filter((card) => card.modeRole === "interpretation")).toHaveLength(1);
    expect(sourcePairRecommendation?.cards?.filter((card) => card.modeRole === "background")).toHaveLength(1);

    const structurePairRecommendation = mode?.recommendedAction?.({
      ...initial,
      modeProgress: {
        "midnight-calibration": { step: 1 }
      }
    });
    expect(structurePairRecommendation).toMatchObject({
      actionKind: "place-cards",
      domain: "Structure",
      progressUpdates: { step: 2, lastDomain: "Structure", interpretedPosition: expect.any(String) }
    });
    expect(structurePairRecommendation?.cards).toHaveLength(2);
    expect(structurePairRecommendation?.cards?.map((card) => card.domain)).toEqual(["Structure", "Structure"]);
    expect(structurePairRecommendation?.cards?.map((card) => card.cardId).sort()).toEqual(["structure-a", "structure-b"]);
  });

  it("defines Exam Clock and recommends fixed setup before chosen model domains", () => {
    const mode = gameModes.find((candidate) => candidate.id === "exam-clock");
    expect(mode?.domainVector).toMatchObject({
      Source: "F",
      Structure: "C",
      Chameleon: "C",
      Void: "C",
      Volition: "F",
      Aspect: "A"
    });
    expect(mode?.timerPreset).toMatchObject({
      label: "Start Exam Clock timer",
      durationMs: 600000,
      messageOnFinish: "Grade the current decision."
    });
    expect(getNextModeDomain(mode!, {
      order: ["Aspect", "Void"],
      index: 0
    })).toBe("Void");

    const cards = [
      testCard("source-master", "Source"),
      testCard("volition-master", "Volition"),
      testCard("structure-a", "Structure"),
      testCard("chameleon-a", "Chameleon"),
      testCard("void-a", "Void")
    ];
    const initial = { ...createSession(), piles: createDomainPiles(cards) };
    expect(mode?.recommendedAction?.(initial)).toMatchObject({
      actionKind: "start-timer",
      domains: ["Source", "Volition"],
      timerPreset: {
        durationMs: 600000,
        messageOnFinish: "Grade the current decision."
      },
      progressUpdates: { phase: "source-choice" }
    });

    const afterTimer = {
      ...initial,
      modeProgress: { "exam-clock": { phase: "source-choice" } }
    };
    expect(mode?.recommendedAction?.(afterTimer)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Source",
      progressUpdates: { phase: "volition-choice" }
    });

    const afterSourceChoice = {
      ...initial,
      modeProgress: { "exam-clock": { phase: "volition-choice" } }
    };
    expect(mode?.recommendedAction?.(afterSourceChoice)).toMatchObject({
      actionKind: "inspect-pile",
      domain: "Volition",
      progressUpdates: { phase: "choice-cycle", choiceStep: 0 }
    });

    const afterFixed = {
      ...initial,
      tableau: [
        { ...placedCard(), cardId: "source-master" },
        { ...placedCard(), instanceId: "volition-instance", cardId: "volition-master" }
      ],
      modeProgress: { "exam-clock": { phase: "choice-cycle" } }
    };
    expect(mode?.recommendedAction?.(afterFixed)).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Structure",
      progressUpdates: { choiceStep: 1 }
    });

    expect(mode?.recommendedAction?.({
      ...afterFixed,
      modeProgress: {
        "exam-clock": { phase: "choice-cycle", choiceStep: 1 }
      }
    })).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Chameleon",
      progressUpdates: { choiceStep: 2 }
    });
  });

  it("defines Painter's Trace as chosen Structure/Chameleon/Void only", () => {
    const mode = gameModes.find((candidate) => candidate.id === "painters-trace");
    expect(mode?.domainVector).toMatchObject({
      Source: "A",
      Structure: "C",
      Chameleon: "C",
      Void: "C",
      Volition: "A",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Source", "Aspect", "Structure"],
      index: 0
    })).toBe("Structure");

    const recommendation = mode?.recommendedAction?.(createSession());
    expect(recommendation).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Structure",
      progressUpdates: { step: 1, hint: "add-trace" }
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      modeProgress: {
        "painters-trace": { step: 2 }
      }
    })).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Void",
      progressUpdates: { step: 3, hint: "add-trace" }
    });
  });

  it("defines Bench and Forest as chosen Source/Aspect only", () => {
    const mode = gameModes.find((candidate) => candidate.id === "bench-and-forest");
    expect(mode?.domainVector).toMatchObject({
      Source: "C",
      Structure: "A",
      Chameleon: "A",
      Void: "A",
      Volition: "A",
      Aspect: "C"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Structure", "Volition", "Aspect"],
      index: 0
    })).toBe("Aspect");

    expect(mode?.recommendedAction?.(createSession())).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Source",
      progressUpdates: { step: 1, hint: "add-observation-note" }
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      modeProgress: {
        "bench-and-forest": { step: 1 }
      }
    })).toMatchObject({
      actionKind: "choose-candidates",
      domain: "Aspect",
      progressUpdates: { step: 2, hint: "add-observation-note" }
    });
  });

  it("defines Landscape as all-random and cycles through all domains", () => {
    const mode = gameModes.find((candidate) => candidate.id === "landscape");
    expect(mode?.domainVector).toMatchObject({
      Source: "R",
      Structure: "R",
      Chameleon: "R",
      Void: "R",
      Volition: "R",
      Aspect: "R"
    });
    expect(mode?.recommendedAction?.({
      ...createSession(),
      drawCycle: {
        order: ["Aspect", "Source"],
        index: 0
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Aspect"
    });
  });

  it("defines Walk in the Park as random Source/Structure/Chameleon only", () => {
    const mode = gameModes.find((candidate) => candidate.id === "walk-in-the-park");
    expect(mode?.domainVector).toMatchObject({
      Source: "R",
      Structure: "R",
      Chameleon: "R",
      Void: "A",
      Volition: "A",
      Aspect: "A"
    });
    expect(getNextModeDomain(mode!, {
      order: ["Void", "Volition", "Aspect", "Structure"],
      index: 0
    }, ["R"])).toBe("Structure");

    expect(mode?.recommendedAction?.({
      ...createSession(),
      drawCycle: {
        order: ["Source", "Structure", "Chameleon", "Void", "Volition", "Aspect"],
        index: 0
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Source"
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      drawCycle: {
        order: ["Source", "Structure", "Chameleon", "Void", "Volition", "Aspect"],
        index: 1
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Structure"
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      drawCycle: {
        order: ["Source", "Structure", "Chameleon", "Void", "Volition", "Aspect"],
        index: 2
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Chameleon"
    });

    expect(mode?.recommendedAction?.({
      ...createSession(),
      drawCycle: {
        order: ["Source", "Structure", "Chameleon", "Void", "Volition", "Aspect"],
        index: 3
      }
    })).toMatchObject({
      actionKind: "draw-random",
      domain: "Source"
    });
  });
});

describe("mode-aware pile highlighting", () => {
  it("highlights Aspect for Abstraction", () => {
    const abstraction = gameModes.find((mode) => mode.id === "abstraction");
    const recommendation = abstraction?.recommendedAction?.({
      ...createSession(),
      modeProgress: { abstraction: { topicNotePlaced: true } }
    }) ?? null;

    expect(getHighlightedDomainsForRecommendation(recommendation, "Source")).toEqual(["Aspect"]);
  });

  it("highlights Source then Aspect for Source Review phases", () => {
    const mode = gameModes.find((candidate) => candidate.id === "source-review");
    const cards = [
      testCard("source-domain", "Source", "The Source"),
      testCard("source-elements", "Source", "Elements", "Elements"),
      testCard("aspect-domain", "Aspect", "The Aspect"),
      testCard("aspect-detail", "Aspect", "Angle", "Operators")
    ];
    const initial = { ...createSession(), piles: createDomainPiles(cards) };

    expect(
      getHighlightedDomainsForRecommendation(mode?.recommendedAction?.(initial, cards) ?? null)
    ).toEqual(["Source"]);

    const afterSourceSetup = {
      ...initial,
      tableau: [
        { ...placedCard(), cardId: "source-domain" },
        { ...placedCard(), instanceId: "source-elements-instance", cardId: "source-elements" }
      ]
    };

    expect(
      getHighlightedDomainsForRecommendation(
        mode?.recommendedAction?.(afterSourceSetup, cards) ?? null
      )
    ).toEqual(["Aspect"]);
  });

  it("highlights only active Walk in the Park domains", () => {
    const mode = gameModes.find((candidate) => candidate.id === "walk-in-the-park");

    for (const [index, expected] of [
      [0, "Source"],
      [1, "Structure"],
      [2, "Chameleon"],
      [3, "Source"]
    ] as const) {
      const recommendation = mode?.recommendedAction?.({
        ...createSession(),
        drawCycle: {
          order: ["Source", "Structure", "Chameleon", "Void", "Volition", "Aspect"],
          index
        }
      }) ?? null;

      expect(getHighlightedDomainsForRecommendation(recommendation, "Void")).toEqual([expected]);
      expect(["Void", "Volition", "Aspect"]).not.toContain(expected);
    }
  });

  it("uses fallback cycle domain when no mode recommendation exists", () => {
    expect(getHighlightedDomainsForRecommendation(null, "Structure")).toEqual(["Structure"]);
  });

  it("highlights all domains for Minimalism's initial master-card placement", () => {
    const minimalism = gameModes.find((mode) => mode.id === "minimalism");
    const recommendation = minimalism?.recommendedAction?.(createSession()) ?? null;

    expect(getHighlightedDomainsForRecommendation(recommendation, "Source")).toEqual(DOMAIN_ORDER);
  });

  it("highlights all explicit domains from a multi-domain recommendation", () => {
    expect(getHighlightedDomainsForRecommendation({
      label: "Place model core",
      description: "Place two masters",
      actionKind: "place-domain-masters",
      domains: ["Structure", "Chameleon"]
    }, "Source")).toEqual(["Structure", "Chameleon"]);
  });
});

describe("guided pile sessions", () => {
  it("records draws from the requested pile and ignores unrelated manual piles", () => {
    const session = {
      modeId: "ablation-study",
      domain: "Source",
      stepId: "ablation-study:Source",
      cardsDrawn: [],
      progressUpdates: { reviewedSourceCards: true }
    };

    const unchanged = recordGuidedPileDraw(session, {
      type: "pile.drawSpecificCard",
      domain: "Structure",
      cardId: "structure-a"
    });
    expect(unchanged?.cardsDrawn).toEqual([]);

    const changed = recordGuidedPileDraw(session, {
      type: "pile.drawSpecificCard",
      domain: "Source",
      cardId: "source-a"
    });
    expect(changed?.cardsDrawn).toEqual(["source-a"]);
  });

  it("completes after a guided draw or explicit Done, not for ordinary close", () => {
    const emptySession = {
      modeId: "ablation-study",
      domain: "Source",
      stepId: "ablation-study:Source",
      cardsDrawn: [],
      progressUpdates: { reviewedSourceCards: true }
    };
    const drawnSession = { ...emptySession, cardsDrawn: ["source-a"] };

    expect(getGuidedPileCompletionPatch(null)).toBeNull();
    expect(getGuidedPileCompletionPatch(emptySession)).toBeNull();
    expect(getGuidedPileCompletionPatch(emptySession, true)).toEqual({
      modeId: "ablation-study",
      patch: { reviewedSourceCards: true }
    });
    expect(getGuidedPileCompletionPatch(drawnSession)).toEqual({
      modeId: "ablation-study",
      patch: { reviewedSourceCards: true }
    });
  });
});

describe("new session wizard flow", () => {
  it("does not automatically open the separate Mode panel after wizard completion", () => {
    expect(shouldOpenModePanelAfterWizard()).toBe(false);
  });
});
