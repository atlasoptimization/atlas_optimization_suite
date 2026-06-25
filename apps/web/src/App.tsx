import { useEffect, useMemo, useRef, useState } from "react";
import { loadManifest } from "./assets/loadManifest";
import { featureConfig } from "./config/features";
import type { CustomCard, DeckCard, DeckManifest } from "./core/types/card";
import { createSession } from "./engine/createSession";
import { createDomainPiles, getNextDomain } from "./engine/piles";
import {
  applyHistoryAction,
  canRedo,
  canUndo,
  createHistoryState,
  redoHistory,
  undoHistory
} from "./engine/sessionHistory";
import { gameModes } from "./modes/modeRegistry";
import { DEFAULT_MODE_ID } from "./modes/constants";
import { getHighlightedDomainsForRecommendation } from "./modes/modeHighlights";
import { enrichModeRecommendation } from "./modes/modeRecommendationMetadata";
import {
  getGuidedPileCompletionPatch,
  recordGuidedPileDraw as recordGuidedPileSessionDraw,
  type ModeGuidedPileSession
} from "./modes/guidedPileSession";
import {
  getCardsById,
  getDomainMasterCard,
  getSelectedArrow,
  getSelectedCard,
  getSelectedInstance,
  getSelectedNote
} from "./engine/selectors";
import {
  hasSavedLocalSession,
  loadLocalSession,
  saveFullSession
} from "./storage/localSessionStorage";
import {
  clampOverlayScale,
  loadViewSettings,
  saveViewSettings
} from "./storage/localViewSettingsStorage";
import {
  createCustomCard,
  loadCustomCards,
  saveCustomCards,
  updateCustomCard,
  type CustomCardInput
} from "./storage/localCustomCardsStorage";
import {
  createCustomMode,
  loadCustomModes,
  saveCustomModes,
  updateCustomMode,
  type CustomModeInput
} from "./storage/localCustomModesStorage";
import { downloadSessionJson } from "./storage/exportSessionJson";
import { filenamePart } from "./storage/exportSessionJson";
import { parseSessionJson } from "./storage/importSessionJson";
import { downloadCustomCardsCsv } from "./customCards/exportCustomCardsCsv";
import { parseCustomCardsCsv } from "./customCards/importCustomCardsCsv";
import {
  downloadCustomCardsJson,
  parseCustomCardsJson
} from "./customCards/customCardsJson";
import {
  getActiveCustomDomainCards,
  getActiveDomainNames,
  getDiscoveredCustomDomains
} from "./customDomains/discoveredCustomDomains";
import {
  loadCustomDomainSettings,
  saveCustomDomainSettings
} from "./storage/localCustomDomainSettingsStorage";
import { sessionToMarkdown } from "./export/sessionToMarkdown";
import { exportDeskAsPng } from "./export/exportDeskImage";
import { buildModeRecommendationPrompt } from "./export/exportLlmContext";
import {
  buildInterpretationContextJson,
  buildInterpretationContextMarkdown
} from "./export/exportInterpretationContext";
import { setStartupIntroHidden, shouldShowStartupIntro } from "./content/intro";
import { useCapabilities } from "./platform/capabilities";
import { useUiProfile } from "./hooks/useUiProfile";
import type { DeckAction } from "./core/types/action";
import type { CustomGameMode, GameMode, ModeRecommendation } from "./core/types/mode";
import type { Pile } from "./core/types/session";
import type { TableauCardSize } from "./core/types/view";
import { DEFAULT_CARD_FACE } from "./core/constants/cardDisplay";
import { isAspectCard } from "./core/constants/aspect";
import { DOMAIN_ORDER } from "./core/constants/domains";
import { getCardDisplayPreset } from "./core/constants/displayPresets";
import type { CardDisplayPresetId } from "./core/types/displayPreset";
import {
  LINEAR_CALIBRATION_SCRIPT_ID,
  getScriptedSession,
  resolveScriptCard,
  type ScriptedObjectRef
} from "./demo/scriptedSessions";
import { getDefaultScriptedPlacementForCard } from "./demo/scriptedPlacement";
import { CardBrowser } from "./ui/browser/CardBrowser";
import { ActionMenu } from "./ui/actions/ActionMenu";
import { CustomDomainManager } from "./ui/customDomains/CustomDomainManager";
import { GuidePanel } from "./ui/help/GuidePanel";
import { IntroWindow } from "./ui/intro/IntroWindow";
import { ObjectInspector } from "./ui/inspector/ObjectInspector";
import { FloatingPanel } from "./ui/layout/FloatingPanel";
import type { FloatingPanelLayout } from "./ui/layout/FloatingPanel";
import { MenuBar } from "./ui/layout/MenuBar";
import type { OpenTopPanel } from "./ui/layout/MenuBar";
import { ModePanel } from "./ui/modes/ModePanel";
import { NewSessionWizard } from "./ui/session/NewSessionWizard";
import type { NewSessionWizardResult } from "./ui/session/NewSessionWizard";
import { shouldOpenModePanelAfterWizard } from "./ui/session/newSessionWizardFlow";
import { CardSearchPalette } from "./ui/search/CardSearchPalette";
import { SessionPanel } from "./ui/session/SessionPanel";
import { ViewSettingsPanel } from "./ui/settings/ViewSettingsPanel";
import { Tableau } from "./ui/tableau/Tableau";
import { TimerWindow } from "./ui/timer/TimerWindow";
import { DrawChoiceModal } from "./ui/draw/DrawChoiceModal";
import { useRecentActionEffects } from "./ui/effects/useRecentActionEffects";
import { AtlasApp } from "./atlas/ui/AtlasApp";
import "./style.css";

const EMPTY_MANIFEST: DeckManifest = {
  version: "",
  generatedAt: "",
  handbook: undefined,
  domains: [],
  cardCount: 0,
  cards: []
};

const TOP_PANEL_DEFAULTS: Record<
  Exclude<OpenTopPanel, null>,
  FloatingPanelLayout & { title: string; minWidth: number; minHeight: number }
> = {
  view: { title: "View Settings", x: 340, y: 70, width: 360, height: 500, minWidth: 300, minHeight: 320 },
  mode: { title: "Game Mode", x: 220, y: 50, width: 980, height: 840, minWidth: 620, minHeight: 560 },
  session: { title: "Session", x: 420, y: 110, width: 500, height: 560, minWidth: 380, minHeight: 380 },
  help: { title: "Help / Guide", x: 360, y: 80, width: 680, height: 620, minWidth: 460, minHeight: 420 },
  developer: { title: "Developer", x: 460, y: 130, width: 380, height: 260, minWidth: 300, minHeight: 180 },
  customDomains: { title: "Custom Domains", x: 420, y: 100, width: 520, height: 560, minWidth: 380, minHeight: 360 }
};

const TIMER_PANEL_DEFAULT: FloatingPanelLayout & {
  title: string;
  minWidth: number;
  minHeight: number;
} = {
  title: "Timer",
  x: 760,
  y: 90,
  width: 360,
  height: 500,
  minWidth: 320,
  minHeight: 360
};

const MODE_INTRO_STORAGE_KEY = "dsd.hasSeenModeIntro";
const NEW_SESSION_WIZARD_DISABLED_KEY = "dsd.disableNewSessionWizard";

function mergeCustomCards(...cardLists: CustomCard[][]) {
  const byId = new Map<string, CustomCard>();
  for (const card of cardLists.flat()) {
    byId.set(card.id, card);
  }
  return [...byId.values()].sort((left, right) =>
    left.cardname.localeCompare(right.cardname)
  );
}

function customCardImportSummary(
  format: string,
  imported: number,
  skipped: number,
  warnings: string[]
) {
  const lines = [`Imported ${imported} custom cards from ${format}.`];
  if (skipped > 0) lines.push(`Skipped ${skipped} rows or entries.`);
  if (warnings.length > 0) lines.push(...warnings.slice(0, 8));
  if (warnings.length > 8) lines.push(`...and ${warnings.length - 8} more warnings.`);
  return lines.join("\n");
}

function DisabledBuildFeatureMessage() {
  return (
    <p className="disabled-feature-notice">
      {featureConfig.disabledFeatureMessage}{" "}
      <a href={featureConfig.releaseUrl} target="_blank" rel="noreferrer">
        local version
      </a>
    </p>
  );
}

function DataScienceDeckApp() {
  const hasSavedSessionAtStartup = useRef(
    featureConfig.enableLocalSaveLoad && hasSavedLocalSession()
  );
  const [manifest, setManifest] = useState<DeckManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
  const [viewSettings, setViewSettings] = useState(loadViewSettings);
  const [customCards, setCustomCards] = useState<CustomCard[]>(() =>
    featureConfig.enableCustomCards
      ? mergeCustomCards(
          loadCustomCards(),
          featureConfig.enableLocalSaveLoad ? loadLocalSession().customCards ?? [] : []
        )
      : []
  );
  const [customDomainSettings, setCustomDomainSettings] = useState(loadCustomDomainSettings);
  const [customModes, setCustomModes] = useState<CustomGameMode[]>(loadCustomModes);
  const [recentAction, setRecentAction] = useState<DeckAction | null>(null);
  const [requestedPileInspectDomain, setRequestedPileInspectDomain] = useState<string | null>(null);
  const [guidedPileSession, setGuidedPileSession] = useState<ModeGuidedPileSession | null>(null);
  const [openTopPanel, setOpenTopPanel] = useState<OpenTopPanel>(null);
  const [newSessionWizardOpen, setNewSessionWizardOpen] = useState(false);
  const [startupIntroOpen, setStartupIntroOpen] = useState(() =>
    shouldShowStartupIntro(typeof window !== "undefined" && window.innerWidth <= 768)
  );
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const [helpInitialSectionId, setHelpInitialSectionId] = useState<string | undefined>();
  const [topPanelLayouts, setTopPanelLayouts] = useState<
    Partial<Record<Exclude<OpenTopPanel, null>, FloatingPanelLayout>>
  >({});
  const [timerPanelLayout, setTimerPanelLayout] = useState<FloatingPanelLayout>(
    TIMER_PANEL_DEFAULT
  );
  const tableauExportRef = useRef<HTMLElement | null>(null);
  const handledTimerFinishRef = useRef<string | null>(null);
  const timerRestartTimeoutRef = useRef<number | null>(null);
  const loggedRestoredSessionRef = useRef(false);
  const suppressStartupFlowAfterIntroHelpRef = useRef(false);
  const capabilities = useCapabilities();
  const uiProfile = useUiProfile();
  const [history, setHistory] = useState(() => {
    const savedSession = featureConfig.enableLocalSaveLoad
      ? loadLocalSession()
      : { tableau: [], notes: [], arrows: [] };
    return createHistoryState({
      ...createSession(),
      ...savedSession,
      tableau: savedSession.tableau,
      notes: savedSession.notes,
      arrows: savedSession.arrows ?? []
    });
  });
  const session = history.present;
  const showBrowserForProfile = viewSettings.showBrowser && !uiProfile.config.collapseCardBrowser;

  useEffect(() => {
    loadManifest()
      .then((loadedManifest) => {
        setManifest(loadedManifest);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
      });
  }, []);

  useEffect(() => {
    if (!hasSavedSessionAtStartup.current || loggedRestoredSessionRef.current) return;
    loggedRestoredSessionRef.current = true;
    console.info(`Restored local session with mode: ${session.activeModeId}`);
  }, [session.activeModeId]);

  useEffect(() => {
    if (startupIntroOpen) return;
    if (suppressStartupFlowAfterIntroHelpRef.current) return;
    if (uiProfile.isMobile) return;

    if (
      !hasSavedSessionAtStartup.current &&
      localStorage.getItem(NEW_SESSION_WIZARD_DISABLED_KEY) !== "true"
    ) {
      setNewSessionWizardOpen(true);
      return;
    }

    if (localStorage.getItem(MODE_INTRO_STORAGE_KEY) === "true") return;
    setOpenTopPanel("mode");
    localStorage.setItem(MODE_INTRO_STORAGE_KEY, "true");
  }, [startupIntroOpen, uiProfile.isMobile]);

  useEffect(() => {
    saveViewSettings(viewSettings);
  }, [viewSettings]);

  useEffect(() => {
    if (!featureConfig.enableCustomCards) return;
    saveCustomCards(customCards);
  }, [customCards]);

  useEffect(() => {
    if (!featureConfig.enableCustomDomains) return;
    saveCustomDomainSettings(customDomainSettings);
  }, [customDomainSettings]);

  useEffect(() => {
    saveCustomModes(customModes);
  }, [customModes]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setSearchPaletteOpen(true);
      } else if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (key === "z") {
        event.preventDefault();
        undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const manifestCards = manifest?.cards ?? [];
  const discoveredCustomDomains = useMemo(
    () => getDiscoveredCustomDomains(manifestCards),
    [manifestCards]
  );
  const activeCustomDomains = useMemo(
    () => featureConfig.enableCustomDomains
      ? discoveredCustomDomains.filter((domain) =>
          customDomainSettings.activeCustomDomainIds.includes(domain.id)
        )
      : [],
    [customDomainSettings.activeCustomDomainIds, discoveredCustomDomains]
  );
  const canonicalManifestCards = useMemo(
    () => manifestCards.filter((card) => card.origin !== "custom-domain"),
    [manifestCards]
  );
  const activeCustomDomainCards = useMemo(
    () => getActiveCustomDomainCards(discoveredCustomDomains, customDomainSettings.activeCustomDomainIds),
    [customDomainSettings.activeCustomDomainIds, discoveredCustomDomains]
  );
  const activePileCards = useMemo(
    () => [...canonicalManifestCards, ...activeCustomDomainCards],
    [activeCustomDomainCards, canonicalManifestCards]
  );
  const activeCards = useMemo(
    () => featureConfig.enableCustomCards ? [...activePileCards, ...customCards] : activePileCards,
    [activePileCards, customCards]
  );
  const cardsById = useMemo(
    () => getCardsById([...manifestCards, ...customCards]),
    [customCards, manifestCards]
  );
  const modes = useMemo(() => [...gameModes, ...customModes], [customModes]);
  const effects = useRecentActionEffects(
    recentAction,
    session,
    viewSettings.enableVisualEffects
  );
  const defaultMode = modes.find((mode) => mode.id === DEFAULT_MODE_ID) ?? modes[0] ?? null;
  const activeMode = modes.find((mode) => mode.id === session.activeModeId) ?? defaultMode;
  const rawModeRecommendation = activeMode?.recommendedAction?.(session, activePileCards) ?? null;
  const modeRecommendationDisabledReason = getRecommendationDisabledReason(rawModeRecommendation);
  const modeRecommendation = enrichModeRecommendation({
    mode: activeMode,
    recommendation: rawModeRecommendation,
    session,
    disabledReason: modeRecommendationDisabledReason
  });
  const nextDomainForTopBar = getNextDomain(session.drawCycle);
  const highlightedPileDomains = getHighlightedDomainsForRecommendation(
    modeRecommendation,
    nextDomainForTopBar
  );
  const selectedInstance = getSelectedInstance(session);
  const selectedCard = getSelectedCard(session, cardsById);
  const selectedNote = getSelectedNote(session);
  const selectedArrow = getSelectedArrow(session);

  useEffect(() => {
    if (!manifest) return;
    dispatchAction({ type: "piles.initialize", cards: activePileCards });
  }, [activePileCards, manifest]);

  function dispatchAction(action: DeckAction) {
    const enrichedAction = applyDefaultCardDisplay(action);
    setRecentAction(enrichedAction);
    recordGuidedPileDraw(enrichedAction);
    setHistory((current) => applyHistoryAction(current, enrichedAction));
  }

  function recordGuidedPileDraw(action: DeckAction) {
    setGuidedPileSession((current) => recordGuidedPileSessionDraw(current, action));
  }

  function completeGuidedPileSession(forceComplete = false) {
    const completion = getGuidedPileCompletionPatch(guidedPileSession, forceComplete);
    if (completion) {
      dispatchAction({
        type: "mode.updateProgress",
        modeId: completion.modeId,
        patch: completion.patch
      });
    }

    setGuidedPileSession(null);
  }

  function applyDefaultCardDisplay(action: DeckAction): DeckAction {
    const preset = getCardDisplayPreset(viewSettings.defaultCardDisplayPreset);
    const customCard = action.type === "card.place" ? cardsById.get(action.cardId) : null;
    const displayDefaults = {
      displayMode: customCard?.isCustom || customCard?.origin === "custom" ? "text-card" : preset.displayMode,
      face: preset.face ?? DEFAULT_CARD_FACE,
      scale: scaleForCardSize(viewSettings.cardSize)
    };

    switch (action.type) {
      case "card.place":
        return {
          ...action,
          displayMode: action.displayMode ?? displayDefaults.displayMode,
          face: action.face ?? displayDefaults.face,
          scale: action.scale ?? displayDefaults.scale,
          orientation: action.orientation ?? (isAspectCard(customCard) ? "modifier" : undefined)
        };
      case "card.placeHidden":
      case "piles.drawDomain":
      case "pile.drawRandom":
      case "pile.drawMany":
      case "pile.drawCandidates":
      case "pile.drawSpecificCard":
      case "pile.playFromDiscard":
      case "draw.placeFilteredCards":
      case "draw.startFilteredChoice":
        return {
          ...action,
          displayMode: action.displayMode ?? displayDefaults.displayMode,
          face: action.face ?? displayDefaults.face,
          scale: action.scale ?? displayDefaults.scale
        };
      default:
        return action;
    }
  }

  function undo() {
    setRecentAction(null);
    setHistory((current) => undoHistory(current));
  }

  function redo() {
    setRecentAction(null);
    setHistory((current) => redoHistory(current));
  }

  function toggleTopPanel(panel: Exclude<OpenTopPanel, null>) {
    setOpenTopPanel((current) => (current === panel ? null : panel));
  }

  function placeCard(card: DeckCard) {
    dispatchAction({
      type: "card.place",
      cardId: card.id,
      displayMode: card.isCustom || card.origin === "custom" ? "text-card" : undefined
    });
  }

  function applyDisplayPresetToBoard(presetId: CardDisplayPresetId) {
    const preset = getCardDisplayPreset(presetId);
    dispatchAction({
      type: "board.applyDisplayPresetToCards",
      displayMode: preset.id === "original" ? undefined : preset.displayMode,
      face: preset.id === "original" ? undefined : preset.face,
      label: preset.label,
      restorePrevious: preset.id === "original"
    });
  }

  function saveSession() {
    if (!featureConfig.enableLocalSaveLoad) {
      showDisabledFeatureMessage();
      return;
    }
    saveFullSession(sessionForPersistence());
  }

  function sessionForPersistence() {
    return {
      ...session,
      customCards,
      customDomains: []
    };
  }

  function newSession() {
    if (!confirmSessionReset("Start a new session?")) return;
    setNewSessionWizardOpen(true);
  }

  function loadExampleSession(scriptId = LINEAR_CALIBRATION_SCRIPT_ID, options: { skipConfirm?: boolean } = {}) {
    if (!options.skipConfirm && !confirmSessionReset("Load the scripted example? This replaces the current board.")) return;
    const script = getScriptedSession(scriptId);
    const exampleSession = createSession();
    exampleSession.title = script.title;
    exampleSession.question = script.problemStatement;
    exampleSession.context = script.description;
    exampleSession.activeModeId = "scripted-demo";
    exampleSession.modeEnforcement = "guided";
    exampleSession.customCards = customCards;
    exampleSession.customDomains = [];
    exampleSession.piles = createInitialPiles(activePileCards, true);
    exampleSession.modeProgress = {
      "scripted-demo": {
        scriptId: script.id,
        stepIndex: 0,
        lastCommentary: script.description
      }
    };
    exampleSession.log = [
      {
        id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toISOString(),
        actionType: "script.load",
        label: "Loaded scripted example",
        details: { scriptId: script.id }
      }
    ];
    dispatchAction({
      type: "session.load",
      session: {
        ...exampleSession,
        customCards,
        customDomains: []
      }
    });
    setOpenTopPanel("mode");
  }

  function startNewSessionFromWizard(result: NewSessionWizardResult) {
    const nextSession = createSession();
    nextSession.title = result.title;
    nextSession.question = result.question;
    nextSession.context = result.context;
    nextSession.activeModeId = result.modeId || DEFAULT_MODE_ID;
    nextSession.modeEnforcement = "guided";
    nextSession.customCards = customCards;

    if (activePileCards.length > 0) {
      nextSession.piles = createInitialPiles(activePileCards, result.shufflePiles);
    }

    dispatchAction({ type: "session.load", session: nextSession });
    if (result.startWithDomainMasters) {
      const masterCards = DOMAIN_ORDER
        .map((candidateDomain) => getDomainMasterCard(candidateDomain, activePileCards))
        .filter((card): card is DeckCard => Boolean(card))
        .map((card) => ({ cardId: card.id, domain: card.domain }));

      if (masterCards.length > 0) {
        dispatchAction({
          type: "draw.placeFilteredCards",
          cards: masterCards,
          logActionType: "wizard.placeDomainMasters",
          logLabel: `Placed ${masterCards.length} domain master cards`
        });
      }
    }

    if (result.disableStartupWizard) {
      localStorage.setItem(NEW_SESSION_WIZARD_DISABLED_KEY, "true");
    }

    setNewSessionWizardOpen(false);
    setOpenTopPanel(shouldOpenModePanelAfterWizard() ? "mode" : null);
    localStorage.setItem(MODE_INTRO_STORAGE_KEY, "true");
  }

  function loadSavedSession() {
    if (!featureConfig.enableLocalSaveLoad) {
      showDisabledFeatureMessage();
      return;
    }
    if (!confirmSessionReset("Load the locally saved session?")) return;
    const savedSession = loadLocalSession();
    const nextCustomCards = mergeCustomCards(customCards, savedSession.customCards ?? []);
    setCustomCards(nextCustomCards);
    const nextSession = {
      ...createSession(),
      ...savedSession,
      customCards: nextCustomCards,
      customDomains: [],
      tableau: savedSession.tableau,
      notes: savedSession.notes,
      arrows: savedSession.arrows ?? []
    };
    dispatchAction({ type: "session.load", session: nextSession });
  }

  function clearSession() {
    if (!confirmSessionReset("Clear current board/session? This removes placed cards, notes, arrows, and session log from the current session.")) return;
    if (timerRestartTimeoutRef.current !== null) {
      window.clearTimeout(timerRestartTimeoutRef.current);
      timerRestartTimeoutRef.current = null;
    }
    handledTimerFinishRef.current = null;
    setViewSettings((current) => ({ ...current, showTimer: false }));
    dispatchAction({ type: "session.clear" });
  }

  function confirmSessionReset(message: string) {
    const hasWork =
      session.tableau.length > 0 ||
      session.notes.length > 0 ||
      session.arrows.length > 0 ||
      session.log.length > 0 ||
      Boolean(session.question || session.context || session.conclusion || session.nextMove);

    return !hasWork || window.confirm(message);
  }

  async function importSessionJson(file: File) {
    try {
      const text = await file.text();
      const result = parseSessionJson(text);
      const nextCustomCards = mergeCustomCards(customCards, result.session.customCards);
      const nextSession = {
        ...result.session,
        customCards: nextCustomCards,
        customDomains: []
      };
      setCustomCards(nextCustomCards);
      dispatchAction({ type: "session.load", session: nextSession });
      if (featureConfig.enableLocalSaveLoad) saveFullSession(nextSession);
      if (result.warnings.length > 0) {
        window.alert(`Session imported with warnings:\n${result.warnings.join("\n")}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Could not import session JSON:\n${message}`);
    }
  }

  async function importCustomCardsCsv(file: File) {
    if (!featureConfig.enableCustomCards) {
      showDisabledFeatureMessage();
      return;
    }
    try {
      const text = await file.text();
      const result = parseCustomCardsCsv(text);
      if (result.cards.length > 0) {
        setCustomCards((current) => mergeCustomCards(current, result.cards));
      }
      window.alert(customCardImportSummary("CSV", result.imported, result.skipped, result.warnings));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Could not import custom cards CSV:\n${message}`);
    }
  }

  async function importCustomCardsJson(file: File) {
    if (!featureConfig.enableCustomCards) {
      showDisabledFeatureMessage();
      return;
    }
    try {
      const text = await file.text();
      const result = parseCustomCardsJson(text, customCards.map((card) => card.id));
      if (result.cards.length > 0) {
        setCustomCards((current) => mergeCustomCards(current, result.cards));
      }
      window.alert(customCardImportSummary("JSON", result.imported, result.skipped, result.warnings));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Could not import custom cards JSON:\n${message}`);
    }
  }

  function exportSessionMarkdown() {
    const markdown = sessionToMarkdown({ session, cardsById, modes });
    const date = new Date().toISOString().slice(0, 10);

    downloadText(`${filenamePart(session.title)}-report-${date}.md`, markdown, "text/markdown");
  }

  function downloadText(filename: string, text: string, mimeType: string) {
    const blob = new Blob([text], {
      type: mimeType
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportDeskPng() {
    if (!featureConfig.enableDeskPngExport) {
      showDisabledFeatureMessage();
      return;
    }
    const element = tableauExportRef.current;
    if (!element) {
      window.alert("Could not find the tableau to export.");
      return;
    }

    try {
      const date = new Date().toISOString().slice(0, 10);
      await exportDeskAsPng(element, `${filenamePart(session.title)}-desk-${date}.png`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Could not export desk as PNG:\n${message}`);
    }
  }

  async function copyAiContext() {
    if (!featureConfig.enableAskAiContextExport) {
      showDisabledFeatureMessage();
      return;
    }
    const context = buildInterpretationContextJson({
      session,
      cardsById,
      activeMode,
      modeRecommendation
    });
    const prompt = buildInterpretationContextMarkdown(context);

    try {
      await navigator.clipboard.writeText(prompt);
      window.alert("Interpretation context Markdown copied to clipboard.");
    } catch {
      window.alert("Could not copy interpretation context to clipboard.");
    }
  }

  function downloadAiContextMarkdown() {
    if (!featureConfig.enableAskAiContextExport) {
      showDisabledFeatureMessage();
      return;
    }
    const context = buildInterpretationContextJson({
      session,
      cardsById,
      activeMode,
      modeRecommendation
    });
    downloadText(
      `${filenamePart(session.title)}-interpretation-context-${new Date().toISOString().slice(0, 10)}.md`,
      buildInterpretationContextMarkdown(context),
      "text/markdown"
    );
  }

  async function copyAiContextJson() {
    if (!featureConfig.enableAskAiContextExport) {
      showDisabledFeatureMessage();
      return;
    }
    const context = buildInterpretationContextJson({
      session,
      cardsById,
      activeMode,
      modeRecommendation
    });

    try {
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      window.alert("Interpretation context JSON copied to clipboard.");
    } catch {
      window.alert("Could not copy interpretation context JSON to clipboard.");
    }
  }

  async function copyModeAiPrompt(questionContext: string) {
    if (!featureConfig.enableAskAiContextExport) {
      showDisabledFeatureMessage();
      return;
    }

    try {
      await navigator.clipboard.writeText(buildModeRecommendationPrompt(modes, questionContext));
      window.alert("Mode recommendation prompt copied. Paste it into ChatGPT or another assistant.");
    } catch {
      window.alert("Could not copy mode recommendation prompt to clipboard.");
    }
  }

  function downloadLlmContextJson() {
    if (!featureConfig.enableAskAiContextExport) {
      showDisabledFeatureMessage();
      return;
    }
    const context = buildInterpretationContextJson({
      session,
      cardsById,
      activeMode,
      modeRecommendation
    });
    downloadText(
      `${filenamePart(session.title)}-interpretation-context-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(context, null, 2),
      "application/json"
    );
  }

  function drawNext() {
    if (!manifest) return;

    if (modeRecommendation && !modeRecommendationDisabledReason) {
      executeModeRecommendation(modeRecommendation);
      return;
    }

    const nextDomain = getNextDomain(session.drawCycle);
    if (!nextDomain) return;

    dispatchAction({ type: "piles.drawDomain", domain: nextDomain, advanceCycle: true });
  }

  function handleTimerFinish() {
    const timer = session.timer;
    const finishKey = `${timer.startedAt ?? ""}:${timer.durationMs ?? ""}:${timer.actionOnFinish}`;
    if (handledTimerFinishRef.current === finishKey) return;
    handledTimerFinishRef.current = finishKey;
    dispatchAction({ type: "timer.finish" });

    const shouldRunNext = timer.actionOnFinish === "next" || timer.actionOnFinish === "draw-next";
    const shouldAskBeforeNext =
      timer.actionOnFinish === "ask-before-next" ||
      timer.actionOnFinish === "open-draw-next-confirmation";

    if (timer.actionOnFinish === "show-message") {
      window.alert(timer.messageOnFinish || "Timer finished.");
    } else if (shouldRunNext) {
      dispatchAction({
        type: "session.addLog",
        actionType: "timer.next",
        label: "Timer triggered Next"
      });
      drawNext();
    } else if (shouldAskBeforeNext) {
      if (window.confirm(timer.messageOnFinish || "Timer finished. Run Next?")) {
        dispatchAction({
          type: "session.addLog",
          actionType: "timer.next",
          label: "Timer triggered Next"
        });
        drawNext();
      }
    }

    if (timer.autoRestart) {
      timerRestartTimeoutRef.current = window.setTimeout(() => {
        handledTimerFinishRef.current = null;
        timerRestartTimeoutRef.current = null;
        dispatchAction({ type: "timer.restart" });
      }, timer.restartDelayMs ?? 0);
    }
  }

  function drawFromDomain(domain: string) {
    if (!manifest) return;
    dispatchAction({ type: "piles.drawDomain", domain });
  }

  function drawManyFromDomain(domain: string, count: number) {
    if (!manifest) return;
    dispatchAction({ type: "pile.drawMany", domain, count });
  }

  function chooseOneFromDomain(domain: string, count: number) {
    if (!manifest) return;
    dispatchAction({ type: "pile.drawCandidates", domain, count });
  }

  function getAvailableDomainFromCycle(preferredDomain?: string) {
    const order = session.drawCycle.order.length > 0 ? session.drawCycle.order : DOMAIN_ORDER;
    const startIndex = preferredDomain
      ? Math.max(0, order.indexOf(preferredDomain))
      : session.drawCycle.index;
    const allowedModeDomains = activeMode
      ? new Set(
          Object.entries(activeMode.domainVector)
            .filter(([, value]) => value === "R" || value === "C")
            .map(([domain]) => domain)
        )
      : null;

    for (let offset = 0; offset < order.length; offset += 1) {
      const domain = order[(startIndex + offset) % order.length];
      if (allowedModeDomains && !allowedModeDomains.has(domain)) continue;
      const pile = session.piles.find((candidate) => candidate.domain === domain);
      if (pile && pile.currentOrder.length > 0) return domain;
    }

    return "";
  }

  function domainForDrawableRecommendation(recommendation: ModeRecommendation) {
    if (
      recommendation.actionKind !== "choose-candidates" &&
      recommendation.actionKind !== "draw-hidden" &&
      recommendation.actionKind !== "draw-random"
    ) {
      return recommendation.domain;
    }

    const pile = session.piles.find((candidate) => candidate.domain === recommendation.domain);
    if (pile && pile.currentOrder.length > 0) return recommendation.domain;
    return getAvailableDomainFromCycle(recommendation.domain);
  }

  function executeScriptedStep(recommendation: ModeRecommendation) {
    const script = getScriptedSession(recommendation.scriptId ?? LINEAR_CALIBRATION_SCRIPT_ID);
    const stepIndex = recommendation.stepIndex ?? 0;
    const step = script.steps[stepIndex];
    if (!step) return;

    const nextStepIndex = stepIndex + 1;

    if (step.type === "set-session-details") {
      dispatchAction({
        type: "session.updateMetadata",
        metadata: {
          title: step.title,
          question: step.question,
          context: step.context
        }
      });
    } else if (step.type === "set-mode") {
      dispatchAction({ type: "mode.setActive", modeId: step.modeId });
    } else if (step.type === "place-card") {
      const card = resolveScriptCard(step.cardRef, activeCards);
      if (card) {
        const position = getDefaultScriptedPlacementForCard(card, {
          placedCards: session.tableau,
          cardsById,
          sequenceIndex: stepIndex
        });
        dispatchAction({
          type: "script.placeSpecificCard",
          cardId: card.id,
          domain: card.domain,
          x: position.x,
          y: position.y,
          orientation: isAspectCard(card) ? "modifier" : step.orientation,
          displayMode:
            step.displayPreset ??
            (card.frontImage || card.backImage ? "card-face-and-active-effect" : "text-card"),
          hidden: step.hidden,
          commentary: step.commentary
        });
      } else {
        dispatchAction({
          type: "session.addLog",
          actionType: "script.skipMissingCard",
          label: `Skipped missing scripted card: ${step.cardRef.cardname ?? step.cardRef.id ?? "unknown card"}`,
          details: { scriptId: script.id, stepIndex, cardRef: step.cardRef }
        });
      }
    } else if (step.type === "add-note") {
      dispatchAction({
        type: "note.create",
        x: step.x,
        y: step.y,
        text: step.text,
        noteKind: step.noteType
      });
    } else if (step.type === "add-arrow") {
      const arrowEndpoints = getScriptedArrowEndpoints(step.from, step.to) ?? {
        x1: step.x1,
        y1: step.y1,
        x2: step.x2,
        y2: step.y2
      };
      dispatchAction({
        type: "arrow.create",
        x1: arrowEndpoints.x1,
        y1: arrowEndpoints.y1,
        x2: arrowEndpoints.x2,
        y2: arrowEndpoints.y2,
        label: step.label
      });
    }

    dispatchAction({
      type: "session.addLog",
      actionType: "script.step",
      label: step.commentary ?? recommendation.label,
      details: { scriptId: script.id, stepIndex, stepType: step.type }
    });
    dispatchAction({
      type: "mode.updateProgress",
      modeId: "scripted-demo",
      patch: {
        scriptId: script.id,
        stepIndex: nextStepIndex,
        lastCommentary: step.commentary ?? "",
        completed: nextStepIndex >= script.steps.length
      }
    });
  }

  function getScriptedArrowEndpoints(
    from: ScriptedObjectRef | undefined,
    to: ScriptedObjectRef | undefined
  ) {
    const fromPoint = getScriptedObjectCenter(from);
    const toPoint = getScriptedObjectCenter(to);
    if (!fromPoint || !toPoint) return null;
    return {
      x1: fromPoint.x,
      y1: fromPoint.y,
      x2: toPoint.x,
      y2: toPoint.y
    };
  }

  function getScriptedObjectCenter(ref: ScriptedObjectRef | undefined) {
    if (!ref) return null;
    if (ref.type === "note") {
      const note = [...session.notes]
        .reverse()
        .find((candidate) => candidate.text.toLowerCase().includes(ref.textIncludes.toLowerCase()));
      return note ? { x: note.x + 95, y: note.y + 69 } : null;
    }

    const card = resolveScriptCard(ref.cardRef, activeCards);
    if (!card) return null;
    const instance = [...session.tableau].reverse().find((candidate) => candidate.cardId === card.id);
    return instance ? { x: instance.x + 63, y: instance.y + 88 } : null;
  }

  function executeModeRecommendation(recommendation = modeRecommendation) {
    if (!recommendation) return;
    const currentRecommendation = recommendation;

    function updateRecommendationProgress() {
      if (!activeMode || !currentRecommendation.progressUpdates) return;
      dispatchAction({
        type: "mode.updateProgress",
        modeId: activeMode.id,
        patch: currentRecommendation.progressUpdates
      });
    }

    if (recommendation.actionKind === "script-step") {
      executeScriptedStep(recommendation);
      return;
    }

    if (recommendation.actionKind === "choose-candidates" && recommendation.domain) {
      const domain = domainForDrawableRecommendation(recommendation);
      if (!domain) return;
      dispatchAction({
        type: "pile.drawCandidates",
        domain,
        count: recommendation.count ?? 5,
        advanceCycle: true
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "choose-filtered-candidates" && recommendation.cards?.length) {
      dispatchAction({
        type: "draw.startFilteredChoice",
        cards: recommendation.cards,
        displayMode: undefined
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "draw-hidden" && recommendation.domain) {
      const domain = domainForDrawableRecommendation(recommendation);
      if (!domain) return;
      dispatchAction({
        type: "piles.drawDomain",
        domain,
        advanceCycle: true,
        hidden: true
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "draw-random" && recommendation.domain) {
      const domain = domainForDrawableRecommendation(recommendation);
      if (!domain) return;
      dispatchAction({
        type: "piles.drawDomain",
        domain,
        advanceCycle: true
      });
      updateRecommendationProgress();
      return;
    }

    if (
      recommendation.actionKind === "draw-specific" &&
      recommendation.domain &&
      recommendation.cardId
    ) {
      dispatchAction({
        type: "pile.drawSpecificCard",
        domain: recommendation.domain,
        cardId: recommendation.cardId
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "inspect-pile" && recommendation.domain) {
      setRequestedPileInspectDomain(recommendation.domain);
      if (activeMode) {
        setGuidedPileSession({
          modeId: activeMode.id,
          domain: recommendation.domain,
          stepId: `${activeMode.id}:${recommendation.domain}:${recommendation.label}`,
          cardsDrawn: [],
          progressUpdates: recommendation.progressUpdates
        });
      }
      return;
    }

    if (recommendation.actionKind === "create-note") {
      dispatchAction({
        type: "note.create",
        text: recommendation.description
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "start-timer" && recommendation.timerPreset) {
      startTimerPreset(recommendation.timerPreset);
      if (recommendation.domains?.length) {
        const placedCardIds = new Set(session.tableau.map((instance) => instance.cardId));
        const masterCards = recommendation.domains
          .map((candidateDomain) => getDomainMasterCard(candidateDomain, activePileCards))
          .filter((card): card is DeckCard => Boolean(card))
          .filter((card) => !placedCardIds.has(card.id))
          .map((card) => ({ cardId: card.id, domain: card.domain }));

        if (masterCards.length > 0) {
          dispatchAction({
            type: "draw.placeFilteredCards",
            cards: masterCards,
            logActionType: "mode.timerSetup.placeDomainMasters",
            logLabel: `Placed ${masterCards.length} timer setup cards`
          });
        }
      }
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "place-cards" && recommendation.cards?.length) {
      dispatchAction({
        type: "draw.placeFilteredCards",
        cards: recommendation.cards,
        logActionType: "mode.placeCards",
        logLabel: recommendation.label
      });
      updateRecommendationProgress();
      return;
    }

    if (recommendation.actionKind === "place-domain-masters") {
      const placedCardIds = new Set(session.tableau.map((instance) => instance.cardId));
      const domains = recommendation.domains ?? DOMAIN_ORDER;
      const masterCards = domains
        .map((candidateDomain) => getDomainMasterCard(candidateDomain, activePileCards))
        .filter((card): card is DeckCard => Boolean(card))
        .filter((card) => !placedCardIds.has(card.id))
        .map((card) => ({ cardId: card.id, domain: card.domain }));

      if (masterCards.length > 0) {
        dispatchAction({
          type: "draw.placeFilteredCards",
          cards: masterCards,
          logActionType: "mode.minimalism.placeDomainMasters",
          logLabel: `Placed ${masterCards.length} domain master cards`
        });
      }
      updateRecommendationProgress();
    }
  }

  function inspectCurrentModePile(domainOverride?: string) {
    const domain = domainOverride || modeRecommendation?.domain || getNextDomain(session.drawCycle);
    if (domain) setRequestedPileInspectDomain(domain);
  }

  function startTimerPreset(preset: NonNullable<GameMode["timerPreset"]>) {
    if (!featureConfig.enableTimers) {
      showDisabledFeatureMessage();
      return;
    }
    handledTimerFinishRef.current = null;
    setViewSettings((current) => ({ ...current, showTimer: true }));
    dispatchAction({
      type: "timer.configure",
      patch: {
        mode: "countdown",
        durationMs: preset.durationMs,
        messageOnFinish: preset.messageOnFinish,
        actionOnFinish: preset.actionOnFinish ?? "show-message",
        autoRestart: preset.autoRestart ?? false
      }
    });
    dispatchAction({ type: "timer.start" });
  }

  function getRecommendationDisabledReason(recommendation: ModeRecommendation | null) {
    if (!recommendation) return null;

    if (
      (recommendation.actionKind === "choose-candidates" ||
        recommendation.actionKind === "choose-filtered-candidates" ||
        recommendation.actionKind === "draw-hidden" ||
        recommendation.actionKind === "draw-random" ||
        recommendation.actionKind === "draw-specific" ||
        recommendation.actionKind === "inspect-pile") &&
      !recommendation.domain
    ) {
      return "No current domain available";
    }

    if (recommendation.actionKind === "complete") {
      return recommendation.description;
    }

    if (recommendation.actionKind === "choose-filtered-candidates" && !recommendation.cards?.length) {
      return "No matching cards available";
    }

    if (
      (recommendation.actionKind === "choose-candidates" ||
        recommendation.actionKind === "draw-hidden" ||
        recommendation.actionKind === "draw-random" ||
        recommendation.actionKind === "draw-specific") &&
      recommendation.domain
    ) {
      const pile = session.piles.find((candidate) => candidate.domain === recommendation.domain);
      if (!pile || pile.currentOrder.length === 0) {
        if (
          recommendation.actionKind === "choose-candidates" ||
          recommendation.actionKind === "draw-hidden" ||
          recommendation.actionKind === "draw-random"
        ) {
          if (getAvailableDomainFromCycle(recommendation.domain)) return null;
        }
        return `No ${recommendation.domain} cards available`;
      }
      if (recommendation.actionKind === "draw-specific" && recommendation.cardId) {
        if (!pile.currentOrder.includes(recommendation.cardId)) {
          return `${recommendation.domain} card is not available`;
        }
      }
    }

    if (recommendation.actionKind === "place-domain-masters") {
      const placedCardIds = new Set(session.tableau.map((instance) => instance.cardId));
      const domains = recommendation.domains ?? DOMAIN_ORDER;
      const missingMasters = domains
        .map((domain) => getDomainMasterCard(domain, activePileCards))
        .filter((card): card is DeckCard => Boolean(card))
        .filter((card) => !placedCardIds.has(card.id));

      if (missingMasters.length === 0) {
        return "Domain master cards are already placed";
      }
    }

    return null;
  }

  function addNote() {
    dispatchAction({ type: "note.create" });
  }

  function addArrow() {
    dispatchAction({ type: "arrow.create" });
  }

  function createLocalCustomCard(input: CustomCardInput) {
    if (!featureConfig.enableCustomCards) {
      showDisabledFeatureMessage();
      return;
    }
    const card = createCustomCard(input);
    setCustomCards((current) => [...current, card]);
  }

  function updateLocalCustomCard(card: CustomCard, input: CustomCardInput) {
    if (!featureConfig.enableCustomCards) {
      showDisabledFeatureMessage();
      return;
    }
    setCustomCards((current) =>
      current.map((candidate) =>
        candidate.id === card.id ? updateCustomCard(card, input) : candidate
      )
    );
  }

  function deleteLocalCustomCard(cardId: string) {
    if (!featureConfig.enableCustomCards) {
      showDisabledFeatureMessage();
      return;
    }
    const hasPlacedInstances = session.tableau.some((instance) => instance.cardId === cardId);
    if (
      hasPlacedInstances &&
      !window.confirm(
        "Delete this custom card from the library? Existing placed instances may show as missing cards."
      )
    ) {
      return;
    }
    setCustomCards((current) => current.filter((card) => card.id !== cardId));
  }

  function createLocalCustomMode(input: CustomModeInput) {
    const mode = createCustomMode(input);
    setCustomModes((current) => [...current, mode]);
    dispatchAction({ type: "mode.setActive", modeId: mode.id });
  }

  function updateLocalCustomMode(mode: CustomGameMode, input: CustomModeInput) {
    setCustomModes((current) =>
      current.map((candidate) =>
        candidate.id === mode.id ? updateCustomMode(mode, input) : candidate
      )
    );
  }

  function deleteLocalCustomMode(modeId: string) {
    setCustomModes((current) => current.filter((mode) => mode.id !== modeId));
    if (session.activeModeId === modeId) {
      dispatchAction({ type: "mode.setActive", modeId: DEFAULT_MODE_ID });
    }
  }

  function openCustomDomainsHelp() {
    setHelpInitialSectionId("custom-domains");
    setOpenTopPanel("help");
  }

  function openIntroHelp() {
    suppressStartupFlowAfterIntroHelpRef.current = true;
    setStartupIntroOpen(false);
    setHelpInitialSectionId("overview");
    setOpenTopPanel("help");
  }

  function showStartupIntroFromHelp() {
    setStartupIntroHidden(false);
    suppressStartupFlowAfterIntroHelpRef.current = true;
    setStartupIntroOpen(true);
  }

  function startIntroExample(scriptId: string) {
    suppressStartupFlowAfterIntroHelpRef.current = true;
    setStartupIntroOpen(false);
    loadExampleSession(scriptId, { skipConfirm: true });
  }

  function showDisabledFeatureMessage() {
    window.alert(`${featureConfig.disabledFeatureMessage}\n${featureConfig.releaseUrl}`);
  }

  const browserManifest = useMemo<DeckManifest>(() => {
    if (!manifest) {
      return {
        ...EMPTY_MANIFEST,
        domains: getActiveDomainNames([], activeCustomDomains),
        cards: activeCustomDomainCards,
        cardCount: activeCustomDomainCards.length
      };
    }

    return {
      ...manifest,
      domains: getActiveDomainNames(DOMAIN_ORDER, activeCustomDomains),
      cards: activePileCards,
      cardCount: activePileCards.length
    };
  }, [activeCustomDomainCards, activeCustomDomains, activePileCards, manifest]);

  if (loadError) {
    return (
      <div className="error-screen">
        <h1>Deck viewer could not start</h1>
        <p>{loadError}</p>
        <pre>pnpm sync:assets{"\n"}pnpm dev</pre>
      </div>
    );
  }

  return (
    <div
      className={`app-shell theme-${viewSettings.theme} screen-${capabilities.screenClass} ui-${uiProfile.profile} ${
        capabilities.hasTouch ? "has-touch" : "has-pointer"
      }`}
    >
      <MenuBar
        cardCount={manifest?.cardCount ?? 0}
        tableauCount={session.tableau.length}
        openPanel={openTopPanel}
        actionsMenu={
          <ActionMenu
            cards={activePileCards}
            piles={session.piles}
            onDrawNext={drawNext}
            onDrawDomain={drawFromDomain}
            onDrawDomainMany={drawManyFromDomain}
            onChooseOneFromN={chooseOneFromDomain}
            onDispatchAction={dispatchAction}
          />
        }
        onTogglePanel={toggleTopPanel}
        onAddNote={addNote}
        onAddArrow={addArrow}
        onRevealAll={() => dispatchAction({ type: "card.revealAll" })}
        onClear={clearSession}
        onNewSession={newSession}
        onSave={saveSession}
        onLoadLocalSession={loadSavedSession}
        onExportSession={() => downloadSessionJson(sessionForPersistence())}
        onExportMarkdown={exportSessionMarkdown}
        onExportDeskPng={exportDeskPng}
        onImportSession={importSessionJson}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={undo}
        onRedo={redo}
        onOpenSearch={() => setSearchPaletteOpen(true)}
        features={featureConfig}
      />

      {openTopPanel && !(uiProfile.config.hideDeveloperPanel && openTopPanel === "developer") && (
        <FloatingPanel
          id={openTopPanel}
          title={TOP_PANEL_DEFAULTS[openTopPanel].title}
          initialX={TOP_PANEL_DEFAULTS[openTopPanel].x}
          initialY={TOP_PANEL_DEFAULTS[openTopPanel].y}
          initialWidth={TOP_PANEL_DEFAULTS[openTopPanel].width}
          initialHeight={TOP_PANEL_DEFAULTS[openTopPanel].height}
          minWidth={TOP_PANEL_DEFAULTS[openTopPanel].minWidth}
          minHeight={TOP_PANEL_DEFAULTS[openTopPanel].minHeight}
          layout={topPanelLayouts[openTopPanel] ?? TOP_PANEL_DEFAULTS[openTopPanel]}
          onLayoutChange={(layout) =>
            setTopPanelLayouts((current) => ({ ...current, [openTopPanel]: layout }))
          }
          onClose={() => setOpenTopPanel(null)}
        >
          {openTopPanel === "view" && (
            <ViewSettingsPanel
              settings={viewSettings}
              onChange={setViewSettings}
              onApplyPresetToBoard={applyDisplayPresetToBoard}
              onScaleBoardBy={(factor) => dispatchAction({ type: "card.scaleAll", factor })}
              onSetBoardScale={(scale) => dispatchAction({ type: "card.setAllScales", scale })}
              onResetBoardScale={() => dispatchAction({ type: "card.resetAllScales" })}
              features={featureConfig}
            />
          )}
          {openTopPanel === "session" && (
            <SessionPanel
              session={session}
              onRename={(title) => dispatchAction({ type: "session.rename", title })}
              onMetadataChange={(metadata) =>
                dispatchAction({ type: "session.updateMetadata", metadata })
              }
              onSynthesisChange={(synthesis) =>
                dispatchAction({ type: "session.updateSynthesis", synthesis })
              }
              onConclusionChange={(conclusion) =>
                dispatchAction({ type: "session.updateConclusion", conclusion })
              }
              onNextMoveChange={(nextMove) =>
                dispatchAction({ type: "session.updateNextMove", nextMove })
              }
              cardsById={cardsById}
              onClearLog={() => dispatchAction({ type: "session.clearLog" })}
            />
          )}
          {openTopPanel === "mode" && (
            <ModePanel
              state={session}
              modes={modes}
              cards={activePileCards}
              onModeChange={(modeId) => dispatchAction({ type: "mode.setActive", modeId })}
              onCreateCustomMode={createLocalCustomMode}
              onUpdateCustomMode={updateLocalCustomMode}
              onDeleteCustomMode={deleteLocalCustomMode}
              onExecuteRecommendation={executeModeRecommendation}
              onCopyModeAiPrompt={copyModeAiPrompt}
              onInspectCurrentDomainPile={inspectCurrentModePile}
              onLoadExampleSession={loadExampleSession}
              onStartTimerPreset={startTimerPreset}
              enableTimers={featureConfig.enableTimers}
              disabledFeatureMessage={featureConfig.disabledFeatureMessage}
            />
          )}
          {openTopPanel === "help" && (
            <GuidePanel
              initialSectionId={helpInitialSectionId}
              handbookPath={manifest?.handbook?.pdfPath}
              onLoadExampleSession={loadExampleSession}
              onShowStartupIntro={showStartupIntroFromHelp}
            />
          )}
          {openTopPanel === "customDomains" && (
            featureConfig.enableCustomDomains ? (
              <CustomDomainManager
                domains={discoveredCustomDomains}
                activeDomainIds={customDomainSettings.activeCustomDomainIds}
                onToggleDomain={(domainId, enabled) =>
                  setCustomDomainSettings((current) => ({
                    activeCustomDomainIds: enabled
                      ? [...new Set([...current.activeCustomDomainIds, domainId])]
                      : current.activeCustomDomainIds.filter((id) => id !== domainId)
                  }))
                }
              />
            ) : (
              <DisabledBuildFeatureMessage />
            )
          )}
          {openTopPanel === "developer" && (
            <section className="debug-panel">
              <h2>Export interpretation context</h2>
              {featureConfig.enableAskAiContextExport ? (
                <>
                  <p className="muted">
                    Export a private-path-free, LLM-readable tableau context with card meanings,
                    coordinates, notes, arrows, session log, active effects, and nearest neighbors.
                  </p>
                  <div className="developer-export-actions">
                    <button type="button" onClick={copyAiContext}>
                      Copy Markdown prompt
                    </button>
                    <button type="button" onClick={downloadAiContextMarkdown}>
                      Download Markdown
                    </button>
                    <button type="button" onClick={copyAiContextJson}>
                      Copy JSON context
                    </button>
                    <button type="button" onClick={downloadLlmContextJson}>
                      Download JSON
                    </button>
                  </div>
                </>
              ) : (
                <DisabledBuildFeatureMessage />
              )}
            </section>
          )}
        </FloatingPanel>
      )}

      {featureConfig.enableTimers && viewSettings.showTimer && (
        <FloatingPanel
          id="timer"
          title={TIMER_PANEL_DEFAULT.title}
          initialX={TIMER_PANEL_DEFAULT.x}
          initialY={TIMER_PANEL_DEFAULT.y}
          initialWidth={TIMER_PANEL_DEFAULT.width}
          initialHeight={TIMER_PANEL_DEFAULT.height}
          minWidth={TIMER_PANEL_DEFAULT.minWidth}
          minHeight={TIMER_PANEL_DEFAULT.minHeight}
          layout={timerPanelLayout}
          onLayoutChange={setTimerPanelLayout}
          onClose={() => setViewSettings((current) => ({ ...current, showTimer: false }))}
        >
          <TimerWindow
            timer={session.timer}
            onDispatchAction={dispatchAction}
            onFinish={handleTimerFinish}
          />
        </FloatingPanel>
      )}

      {newSessionWizardOpen && (
        <NewSessionWizard
          modes={modes}
          initialTitle={session.title}
          initialQuestion={session.question}
          initialContext={session.context}
          initialModeId={DEFAULT_MODE_ID}
          onStart={startNewSessionFromWizard}
          onCancel={() => setNewSessionWizardOpen(false)}
        />
      )}

      {searchPaletteOpen && (
        <CardSearchPalette
          cards={activeCards}
          onPlaceCard={placeCard}
          onClose={() => setSearchPaletteOpen(false)}
        />
      )}

      <main
        className={`main-grid ${!showBrowserForProfile ? "browser-hidden" : ""}`}
      >
        {showBrowserForProfile && (
          <CardBrowser
            manifest={browserManifest}
            selectedDomain={selectedDomain}
            onSelectedDomainChange={setSelectedDomain}
            onPlaceCard={placeCard}
            showMythicNames={viewSettings.showMythicNames}
            showScientificNames={viewSettings.showScientificNames}
            showKeywords={viewSettings.showKeywords}
            showCustomAssets={
              featureConfig.enableCustomAssets &&
              viewSettings.showCustomAssets &&
              !uiProfile.config.hideCustomAssets
            }
            customCards={customCards}
            discoveredCustomDomains={discoveredCustomDomains}
            activeCustomDomainIds={customDomainSettings.activeCustomDomainIds}
            onCreateCustomCard={createLocalCustomCard}
            onUpdateCustomCard={updateLocalCustomCard}
            onDeleteCustomCard={deleteLocalCustomCard}
            onImportCustomCardsCsv={importCustomCardsCsv}
            onExportCustomCardsCsv={() => downloadCustomCardsCsv(customCards)}
            onImportCustomCardsJson={importCustomCardsJson}
            onExportCustomCardsJson={() => downloadCustomCardsJson(customCards)}
            onManageCustomDomains={() => setOpenTopPanel("customDomains")}
            onOpenCustomDomainsHelp={openCustomDomainsHelp}
            features={featureConfig}
          />
        )}

        <Tableau
          tableau={session.tableau}
          notes={session.notes}
          arrows={session.arrows}
          piles={session.piles}
          cards={activePileCards}
          customDomains={activeCustomDomains}
          cardsById={cardsById}
          selectedInstanceId={session.selectedInstanceId}
          selectedNoteId={session.selectedNoteId}
          selectedArrowId={session.selectedArrowId}
          onSelectInstance={(instanceId) =>
            dispatchAction({ type: "card.selectInstance", instanceId })
          }
          onSelectNote={(noteId) => dispatchAction({ type: "note.select", noteId })}
          onSelectArrow={(arrowId) => dispatchAction({ type: "arrow.select", arrowId })}
          onMoveCard={(instanceId, dx, dy) =>
            dispatchAction({ type: "card.move", instanceId, dx, dy })
          }
          onMoveNote={(noteId, dx, dy) => dispatchAction({ type: "note.move", noteId, dx, dy })}
          onMoveArrowEndpoint={(arrowId, endpoint, dx, dy) =>
            dispatchAction({ type: "arrow.moveEndpoint", arrowId, endpoint, dx, dy })
          }
          onMoveArrow={(arrowId, dx, dy) =>
            dispatchAction({ type: "arrow.move", arrowId, dx, dy })
          }
          onUpdateNoteText={(noteId, text) =>
            dispatchAction({ type: "note.updateText", noteId, text })
          }
          onDispatchAction={dispatchAction}
          onDrawFromPile={drawFromDomain}
          onPlayFromDiscard={(domain, cardId) =>
            dispatchAction({ type: "pile.playFromDiscard", domain, cardId })
          }
          onReturnDiscardToPile={(domain, cardId) =>
            dispatchAction({ type: "pile.returnDiscardToPile", domain, cardId })
          }
          requestedPileInspectDomain={requestedPileInspectDomain}
          onPileInspectRequestHandled={() => setRequestedPileInspectDomain(null)}
          guidedPileSession={guidedPileSession}
          onCompleteGuidedPileSession={completeGuidedPileSession}
          highlightedDomains={highlightedPileDomains}
          cardCount={manifest?.cardCount ?? null}
          viewSettings={viewSettings}
          topologyBackgrounds={manifest?.topologyBackgrounds}
          effects={effects}
          exportRef={tableauExportRef}
          activeModeName={activeMode?.name ?? "Standard"}
          nextRecommendation={modeRecommendation}
          nextActionDisabled={Boolean(modeRecommendation && modeRecommendationDisabledReason)}
          nextActionDisabledReason={modeRecommendationDisabledReason ?? undefined}
          onNext={drawNext}
          onOpenModePanel={() => setOpenTopPanel("mode")}
          onOpenHelp={() => {
            setHelpInitialSectionId(uiProfile.isMobile ? "overview" : undefined);
            setOpenTopPanel("help");
          }}
          onClearSession={clearSession}
          onPileOverlayScaleChange={(scale) =>
            setViewSettings((current) => ({
              ...current,
              pileOverlayScale: clampOverlayScale(scale, current.pileOverlayScale)
            }))
          }
          onNextPanelPositionChange={(nextPanelPosition) =>
            setViewSettings((current) => ({
              ...current,
              nextPanelPosition
            }))
          }
          uiConfig={uiProfile.config}
        />

        {startupIntroOpen && (
          <IntroWindow
            onContinue={() => {
              if (!suppressStartupFlowAfterIntroHelpRef.current) {
                suppressStartupFlowAfterIntroHelpRef.current = false;
              }
              setStartupIntroOpen(false);
            }}
            onOpenHelp={openIntroHelp}
            onSelectMode={(modeId) => dispatchAction({ type: "mode.setActive", modeId })}
            onStartExample={startIntroExample}
            handbookPath={manifest?.handbook?.pdfPath}
          />
        )}

        <aside className="right-panel">
          {viewSettings.showInspector && (
            <ObjectInspector
              card={selectedCard}
              selectedInstance={selectedInstance}
              note={selectedNote}
              arrow={selectedArrow}
              onDisplayModeChange={(displayMode) => {
                if (!selectedInstance) return;
                dispatchAction({
                  type: "card.setDisplayMode",
                  instanceId: selectedInstance.instanceId,
                  displayMode
                });
                if (displayMode === "card-face-and-active-effect") {
                  dispatchAction({
                    type: "card.setFace",
                    instanceId: selectedInstance.instanceId,
                    face: DEFAULT_CARD_FACE
                  });
                }
              }}
              onRevealCard={() => {
                if (!selectedInstance) return;
                dispatchAction({ type: "card.reveal", instanceId: selectedInstance.instanceId });
              }}
              onHideCard={() => {
                if (!selectedInstance) return;
                dispatchAction({ type: "card.hide", instanceId: selectedInstance.instanceId });
              }}
              onToggleAblatedCard={() => {
                if (!selectedInstance) return;
                dispatchAction({
                  type: "card.toggleAblated",
                  instanceId: selectedInstance.instanceId
                });
              }}
              onNoteTextChange={(text) => {
                if (!selectedNote) return;
                dispatchAction({ type: "note.updateText", noteId: selectedNote.id, text });
              }}
              onNoteKindChange={(noteKind) => {
                if (!selectedNote) return;
                dispatchAction({ type: "note.setKind", noteId: selectedNote.id, noteKind });
              }}
              onDeleteNote={() => {
                if (!selectedNote) return;
                dispatchAction({ type: "note.delete", noteId: selectedNote.id });
              }}
              onArrowLabelChange={(label) => {
                if (!selectedArrow) return;
                dispatchAction({
                  type: "arrow.update",
                  arrowId: selectedArrow.id,
                  patch: { label }
                });
              }}
              onArrowStrokeWidthChange={(strokeWidth) => {
                if (!selectedArrow) return;
                dispatchAction({
                  type: "arrow.update",
                  arrowId: selectedArrow.id,
                  patch: { strokeWidth }
                });
              }}
              onDeleteArrow={() => {
                if (!selectedArrow) return;
                dispatchAction({ type: "arrow.delete", arrowId: selectedArrow.id });
              }}
            />
          )}
        </aside>
      </main>
      {session.pendingDrawChoice && (
        <DrawChoiceModal
          choice={session.pendingDrawChoice}
          cardsById={cardsById}
          previewScale={viewSettings.choicePreviewScale}
          onPreviewScaleChange={(scale) =>
            setViewSettings((current) => ({
              ...current,
              choicePreviewScale: clampOverlayScale(scale, current.choicePreviewScale)
            }))
          }
          onChoose={(cardId) => dispatchAction({ type: "pile.chooseCandidate", cardId })}
          onCancel={() => dispatchAction({ type: "pile.cancelCandidateChoice" })}
        />
      )}
    </div>
  );
}

export function getInitialAppView(location: Pick<Location, "hash" | "search">) {
  const params = new URLSearchParams(location.search);
  const requestedApp = params.get("app")?.toLowerCase();
  const hash = location.hash.toLowerCase();

  if (requestedApp === "deck" || hash === "#deck") return "deck";
  return "atlas";
}

function App() {
  const appView = getInitialAppView(
    typeof window === "undefined" ? { hash: "", search: "" } : window.location
  );

  if (appView === "deck") return <DataScienceDeckApp />;
  return <AtlasApp />;
}

function scaleForCardSize(size: TableauCardSize): number {
  if (size === "small") return 0.78;
  if (size === "large") return 1.3;
  return 1;
}

function createInitialPiles(deckCards: DeckCard[], shuffle: boolean): Pile[] {
  if (shuffle) return createDomainPiles(deckCards);

  const domains = [
    ...DOMAIN_ORDER,
    ...new Set(
      deckCards
        .map((card) => card.domain)
        .filter((domain) => !DOMAIN_ORDER.includes(domain as (typeof DOMAIN_ORDER)[number]))
    )
  ];

  return domains.map((domain) => {
    const cardIds = deckCards
      .filter((card) => card.domain === domain)
      .map((card) => card.id);

    return {
      id: `domain-${domain.toLowerCase()}`,
      name: domain,
      domain,
      cardIds,
      currentOrder: [...cardIds],
      drawnCardIds: [],
      discardCardIds: []
    };
  });
}

export default App;
