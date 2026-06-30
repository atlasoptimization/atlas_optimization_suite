import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  checkAtlasBackendHealth,
  evaluateAtlasModel,
  fetchCvxpyAtoms,
  generateAtlasCode,
  solveAtlasModel,
  validateAtlasModel,
  type AtlasCvxpyObjectMetadata
} from "../api/backendClient";
import { FALLBACK_ATOM_SPECS, type AtlasAtomSpec } from "../core/atoms";
import { ATLAS_BUILTIN_EXAMPLES, loadAtlasBuiltinExample, type AtlasBuiltinExampleId } from "../core/builtinExamples";
import { getSelectedAtlasCard } from "../core/cards";
import { getConstraintDependencySummary } from "../core/constraints";
import {
  evaluateAtlasWorkbench,
  getEvaluationEntry,
  type AtlasEvaluationMode,
  type AtlasEvaluationReport
} from "../core/evaluator";
import { createProductionPlanningExample } from "../core/examples";
import { getFunctionDependencySummary, getTaggedSumMatchingCards } from "../core/functions";
import { getSelectedAtlasGroup } from "../core/groups";
import { getObjectiveDependencySummary } from "../core/objectives";
import { evaluateAtlasQuery, getSelectedAtlasQuery } from "../core/queries";
import { atlasReducer } from "../core/reducer";
import type { AtlasCommandId } from "../core/search";
import { renderCardSymbolicPreview } from "../core/symbolic";
import { exportAtlasIR, importAtlasIR, serializeAtlasIR } from "../core/ir";
import {
  createAtlasProjectFile,
  importAtlasProject,
  serializeAtlasProject
} from "../core/project";
import {
  isSolutionStale,
  parseAtlasSolveResult,
  resolveSolutionVariableTarget,
  solutionRuntimeValues,
  type AtlasSolutionState
} from "../core/solution";
import {
  markSolveDiagnosticsStale,
  upsertRuntimeDiagnostics,
  type AtlasRuntimeDiagnostic
} from "../core/runtimeDiagnostics";
import type { AtlasAction, AtlasCardType, AtlasWorkbenchState } from "../core/types";
import { ATLAS_CARD_TEMPLATES, getAtlasCardTemplate } from "../core/templates";
import {
  ATLAS_TUTORIAL_STEPS,
  createTutorialSession,
  executeTutorialAction,
  markTutorialStepApplied,
  nextTutorialSession,
  pendingTutorialActions,
  previousTutorialSession,
  resetTutorialSession,
  tutorialResetState,
  tutorialStepsForExample,
  type AtlasTutorialSession
} from "../core/tutorial";
import {
  loadAtlasWorkbenchState,
  saveAtlasWorkbenchState
} from "../storage/localAtlasStorage";
import { AtlasToolbar, type AtlasToolbarAction } from "./AtlasToolbar";
import { AtlasConstructorPanel } from "./constructor/AtlasConstructorPanel";
import { AtlasWorkbench } from "./workbench/AtlasWorkbench";
import { AtlasInspector } from "./inspector/AtlasInspector";
import { AtlasModelDock } from "./dock/AtlasModelDock";
import { AtlasSolutionPanel } from "./solution/AtlasSolutionPanel";
import { AtlasSearchPalette } from "./search/AtlasSearchPalette";
import { AtlasQueryBuilder } from "./query/AtlasQueryBuilder";
import { AtlasPropertySelector } from "./query/AtlasPropertySelector";
import { AtlasContextMenu, type AtlasContextMenuItem, type AtlasContextMenuState } from "./context/AtlasContextMenu";
import { AtlasTutorialPanel } from "./tutorial/AtlasTutorialPanel";
import { AtlasExamplesPanel } from "./examples/AtlasExamplesPanel";
import {
  AtlasCodeView,
  AtlasDiagnosticsView,
  AtlasIRView,
  AtlasSolutionView,
  AtlasViewTabs,
  buildAtlasViewDiagnostics,
  type AtlasGeneratedCodeState,
  type AtlasWorkbenchView
} from "./views/AtlasMultiView";
import "./atlas.css";

const PLACEHOLDER_ACTION_LABELS: Record<AtlasToolbarAction, string> = {
  evaluate: "Evaluate runs the backend when available and falls back locally.",
  evaluateSolution: "Evaluate uses the latest solution values when available.",
  solve: "Solve sends the current Atlas IR to the backend.",
  inspect: "Inspect validates the current Atlas IR with the backend.",
  generateCode: "Generate Code asks the backend for Python/CVXPY code.",
  export: "Exported Atlas IR JSON.",
  import: "Imported Atlas IR JSON.",
  saveProject: "Saved Atlas project JSON.",
  loadProject: "Loaded Atlas project JSON.",
  loadExample: "Loaded linear CVXPY example.",
  undo: "Undid the last Atlas workbench change.",
  redo: "Redid the last Atlas workbench change.",
  search: "Search is open.",
  clear: "Cleared the Atlas workbench.",
  tutorial: "Opened the Atlas tutorial.",
  examples: "Opened Atlas examples."
};

type AtlasHistory = {
  past: AtlasWorkbenchState[];
  present: AtlasWorkbenchState;
  future: AtlasWorkbenchState[];
};

function createHistoryState(present: AtlasWorkbenchState): AtlasHistory {
  return { past: [], present, future: [] };
}

function historyReducer(history: AtlasHistory, action: AtlasAction | { type: "history.undo" } | { type: "history.redo" }) {
  if (action.type === "history.undo") {
    const previous = history.past.at(-1);
    if (!previous) return history;
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future]
    };
  }

  if (action.type === "history.redo") {
    const next = history.future[0];
    if (!next) return history;
    return {
      past: [...history.past, history.present].slice(-100),
      present: next,
      future: history.future.slice(1)
    };
  }

  const nextPresent = atlasReducer(history.present, action);
  if (nextPresent === history.present) return history;

  if (action.type === "workbench.load") return createHistoryState(nextPresent);

  return {
    past: [...history.past, history.present].slice(-100),
    present: nextPresent,
    future: []
  };
}

export function AtlasApp() {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => createHistoryState(loadAtlasWorkbenchState())
  );
  const [lastAction, setLastAction] = useState("Atlas Optimization Suite prototype loaded.");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dependencyHighlightEnabled, setDependencyHighlightEnabled] = useState(true);
  const [focusedObjectiveTermId, setFocusedObjectiveTermId] = useState<string | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<AtlasEvaluationReport | null>(null);
  const [evaluationMode, setEvaluationMode] = useState<AtlasEvaluationMode>("current");
  const [backendStatus, setBackendStatus] = useState<"unknown" | "connected" | "unavailable">("unknown");
  const [backendDiagnostics, setBackendDiagnostics] = useState<string[]>([]);
  const [cvxpyMetadata, setCvxpyMetadata] = useState<Record<string, AtlasCvxpyObjectMetadata>>({});
  const [atomSpecs, setAtomSpecs] = useState<AtlasAtomSpec[]>(FALLBACK_ATOM_SPECS);
  const [atomRegistryStatus, setAtomRegistryStatus] = useState("Using fallback CVXPY atom palette.");
  const [solution, setSolution] = useState<AtlasSolutionState>({ status: "empty" });
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<AtlasRuntimeDiagnostic[]>([]);
  const [selectedRuntimeDiagnostic, setSelectedRuntimeDiagnostic] = useState<AtlasRuntimeDiagnostic | null>(null);
  const [contextMenu, setContextMenu] = useState<AtlasContextMenuState | null>(null);
  const [tutorial, setTutorial] = useState<AtlasTutorialSession>({ open: false, stepIndex: 0, appliedStepIds: [] });
  const [tutorialSteps, setTutorialSteps] = useState(ATLAS_TUTORIAL_STEPS);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [activeView, setActiveView] = useState<AtlasWorkbenchView>("object");
  const [generatedCode, setGeneratedCode] = useState<AtlasGeneratedCodeState>({ status: "empty" });
  const [diagnosticsStale, setDiagnosticsStale] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const tutorialAppliedRef = useRef(new Set<string>());
  const workbench = history.present;
  const previousWorkbenchRef = useRef(workbench);
  const selectedCard = getSelectedAtlasCard(workbench);
  const selectedGroup = getSelectedAtlasGroup(workbench);
  const selectedQuery = getSelectedAtlasQuery(workbench);
  const currentIR = useMemo(() => exportAtlasIR(workbench), [workbench]);
  const viewDiagnostics = useMemo(
    () =>
      buildAtlasViewDiagnostics({
        ir: currentIR,
        backendDiagnostics,
        runtimeDiagnostics,
        solution
      }),
    [backendDiagnostics, currentIR, runtimeDiagnostics, solution]
  );
  const highlightedCardIds = useMemo(
    () => {
      if (selectedQuery) {
        return new Set(evaluateAtlasQuery(selectedQuery, workbench.cards).map((card) => card.id));
      }

      if (
        dependencyHighlightEnabled &&
        selectedCard?.type === "function" &&
        selectedCard.functionKind === "tagged_sum"
      ) {
        return new Set(
          getTaggedSumMatchingCards(selectedCard, workbench.queries, workbench.cards).map(
            (card) => card.id
          )
        );
      }

      if (dependencyHighlightEnabled && selectedCard?.type === "objective") {
        const summary = getObjectiveDependencySummary(
          selectedCard,
          workbench.cards,
          workbench.queries,
          { termId: focusedObjectiveTermId }
        );
        if (!focusedObjectiveTermId) {
          return new Set(summary.functionCards.map((card) => card.id));
        }
        return new Set(
          [...summary.functionCards, ...summary.participatingCards].map((card) => card.id)
        );
      }

      if (dependencyHighlightEnabled && selectedCard?.type === "constraint") {
        const summary = getConstraintDependencySummary(
          selectedCard,
          workbench.cards,
          workbench.queries
        );
        return new Set(
          [...summary.functionCards, ...summary.participatingCards].map((card) => card.id)
        );
      }

      return new Set<string>();
    },
    [
      dependencyHighlightEnabled,
      focusedObjectiveTermId,
      selectedQuery,
      selectedCard,
      workbench.cards,
      workbench.queries
    ]
  );
  const dependencyPropertyNamesByCardId = useMemo(() => {
    if (
      !dependencyHighlightEnabled ||
      selectedQuery ||
      !selectedCard
    ) {
      return {};
    }

    const functionCards =
      selectedCard.type === "function" && selectedCard.functionKind === "tagged_sum"
        ? [selectedCard]
        : selectedCard.type === "objective"
          ? focusedObjectiveTermId
            ? getObjectiveDependencySummary(selectedCard, workbench.cards, workbench.queries, {
                termId: focusedObjectiveTermId
              }).functionCards
            : []
          : selectedCard.type === "constraint"
            ? getConstraintDependencySummary(selectedCard, workbench.cards, workbench.queries)
                .functionCards
            : [];
    const summaries = functionCards.map((functionCard) =>
      getFunctionDependencySummary(functionCard, workbench.queries, workbench.cards)
    );

    return summaries.reduce<Record<string, Set<string>>>((current, summary) => {
      for (const card of summary.matchedCards) {
        const existing = current[card.id] ?? new Set<string>();
        for (const propertyName of summary.usedProperties) existing.add(propertyName);
        current[card.id] = existing;
      }
      return current;
    }, {});
  }, [
    dependencyHighlightEnabled,
    focusedObjectiveTermId,
    selectedQuery,
    selectedCard,
    workbench.cards,
    workbench.queries
  ]);
  const diagnosticsByCardId = useMemo(
    () =>
      runtimeDiagnostics.reduce<Record<string, AtlasRuntimeDiagnostic[]>>((current, diagnostic) => {
        current[diagnostic.cardId] = [...(current[diagnostic.cardId] ?? []), diagnostic];
        return current;
      }, {}),
    [runtimeDiagnostics]
  );
  const updatedAt = useMemo(
    () => new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date()),
    [lastAction]
  );
  const selectedEvaluationEntry = getEvaluationEntry(evaluationReport, selectedCard?.id);
  const selectedSymbolicPreview = selectedCard
    ? renderCardSymbolicPreview(selectedCard, workbench)
    : null;
  const selectedCvxpyMetadata = selectedCard
    ? cvxpyMetadata[selectedCard.id] ?? cvxpyMetadata[selectedCard.modelObjectId ?? ""]
    : null;
  const solutionWarning =
    evaluationMode === "solution" && isSolutionStale(solution)
      ? "Latest solution is stale because the model changed after solving."
      : evaluationMode === "solution" && Object.keys(solutionRuntimeValues(solution)).length === 0
        ? "No latest solution values are available."
        : null;

  useEffect(() => {
    saveAtlasWorkbenchState(workbench);
  }, [workbench]);

  useEffect(() => {
    if (previousWorkbenchRef.current === workbench) return;
    previousWorkbenchRef.current = workbench;
    setSolution((current) =>
      current.status === "success"
        ? { ...current, stale: true }
        : current.status === "loading" || current.status === "error"
          ? { ...current, stale: true }
          : current
    );
    setRuntimeDiagnostics(markSolveDiagnosticsStale);
    setCvxpyMetadata({});
    setDiagnosticsStale(true);
    setGeneratedCode((current) =>
      current.status === "success"
        ? { ...current, stale: true }
        : current.status === "loading" || current.status === "error"
          ? { ...current, stale: true }
          : current
    );
  }, [workbench]);

  useEffect(() => {
    checkAtlasBackendHealth()
      .then(() => setBackendStatus("connected"))
      .catch(() => setBackendStatus("unavailable"));
  }, []);

  useEffect(() => {
    fetchCvxpyAtoms()
      .then((response) => {
        if (response.atoms.length > 0) {
          setAtomSpecs(response.atoms);
          setAtomRegistryStatus(`Loaded ${response.atoms.length} atoms from backend registry.`);
        }
      })
      .catch(() => {
        setAtomSpecs(FALLBACK_ATOM_SPECS);
        setAtomRegistryStatus("Backend atom registry unavailable; using fallback atoms.");
      });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
        setLastAction("Command palette toggled.");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!tutorial.open) return;
    const step = tutorialSteps[tutorial.stepIndex];
    if (!step) return;
    if (tutorialAppliedRef.current.has(step.id)) return;
    const actions = pendingTutorialActions(tutorial, tutorialSteps);
    if (actions.length === 0) return;
    tutorialAppliedRef.current.add(step.id);
    for (const action of actions) {
      const result = executeTutorialAction(workbench, action);
      if (result.dispatch) dispatch(result.dispatch);
      if (result.state !== workbench) dispatch({ type: "workbench.load", state: result.state });
      if (result.diagnostic) setLastAction(result.diagnostic);
      if (action.type === "message") setLastAction(action.text);
      if (action.type === "validate") void handleToolbarAction("inspect");
      if (action.type === "evaluate") void handleToolbarAction("evaluate");
      if (action.type === "solve") void handleToolbarAction("solve");
      if (action.type === "generateCode") void handleToolbarAction("generateCode");
    }
    setTutorial((current) => markTutorialStepApplied(current, step.id));
  }, [tutorial, tutorialSteps, workbench]);

  function createCard(cardType: AtlasCardType) {
    dispatch({ type: "card.create", cardType });
    setLastAction(`Created ${cardType} card.`);
  }

  function createCardFromTemplate(templateId: string) {
    const template = getAtlasCardTemplate(templateId);
    dispatch({ type: "card.createFromTemplate", templateId });
    setLastAction(template ? `Created ${template.name} card.` : "Template not found.");
  }

  function createGroup() {
    dispatch({ type: "group.create" });
    setLastAction("Created visual group.");
  }

  async function handleToolbarAction(action: AtlasToolbarAction) {
    if (action === "evaluate" || action === "evaluateSolution") {
      const ir = currentIR;
      const mode = action === "evaluateSolution" ? "solution" : evaluationMode;
      const runtimeValues = mode === "solution" ? solutionRuntimeValues(solution) : {};
      if (mode === "solution" && Object.keys(runtimeValues).length === 0) {
        setLastAction("No latest solution values are available for solution-based evaluation.");
        return;
      }
      if (action === "evaluateSolution") setEvaluationMode("solution");
      try {
        const response = await evaluateAtlasModel(ir);
        setBackendStatus("connected");
        const diagnostics = response.diagnostics?.map((diagnostic) => diagnostic.message) ?? [];
        const summary = summarizeBackendEvaluation(response);
        setBackendDiagnostics([...summary, ...diagnostics]);
        const report = evaluateAtlasWorkbench(workbench, {
          mode,
          runtimeValues
        });
        setEvaluationReport(report);
        setRuntimeDiagnostics((current) =>
          upsertRuntimeDiagnostics(current, diagnosticsFromEvaluationReport(report))
        );
        setLastAction(
          diagnostics.length === 0
            ? `Backend evaluation completed at ${mode} values.`
            : `Backend evaluation returned ${diagnostics.length} diagnostics.`
        );
      } catch (error) {
        const report = evaluateAtlasWorkbench(workbench, {
          mode,
          runtimeValues
        });
        setEvaluationReport(report);
        setRuntimeDiagnostics((current) =>
          upsertRuntimeDiagnostics(current, diagnosticsFromEvaluationReport(report))
        );
        setBackendStatus("unavailable");
        setBackendDiagnostics([
          error instanceof Error ? error.message : "Backend evaluation failed; used local evaluator."
        ]);
        setLastAction(
          report.diagnostics.length === 0
            ? "Backend unavailable; local evaluation completed."
            : `Backend unavailable; local evaluation returned ${report.diagnostics.length} diagnostics.`
        );
      }
      return;
    }

    if (action === "solve") {
      const ir = currentIR;
      setSolution((current) => ({
        status: "loading",
        previous: current.status === "success" ? current.result : "previous" in current ? current.previous : null,
        stale: current.status === "success" ? current.stale : "stale" in current ? current.stale : false
      }));
      try {
        const response = await solveAtlasModel(ir);
        const result = parseAtlasSolveResult(response);
        setBackendStatus("connected");
        const diagnostics = result.diagnostics.map((diagnostic) => diagnostic.message);
        setBackendDiagnostics(diagnostics);
        setSolution({ status: "success", result, stale: false });
        if (result.code) setGeneratedCode({ status: "success", code: result.code, stale: false });
        setRuntimeDiagnostics((current) =>
          upsertRuntimeDiagnostics(current, diagnosticsFromSolveResult(result, workbench))
        );
        setLastAction(
          result.status
            ? `Solve status: ${result.status}.`
            : "Solve request completed."
        );
      } catch (error) {
        setBackendStatus("unavailable");
        const message = error instanceof Error ? error.message : "Backend solve failed.";
        setBackendDiagnostics([message]);
        setSolution((current) => ({
          status: "error",
          message,
          previous: current.status === "success" ? current.result : "previous" in current ? current.previous : null,
          stale: current.status === "success" ? current.stale : "stale" in current ? current.stale : false
        }));
        setLastAction("Backend unavailable; solve was not run.");
      }
      return;
    }

    if (action === "inspect") {
      const ir = currentIR;
      try {
        const response = await validateAtlasModel(ir);
        setBackendStatus("connected");
        const diagnostics = response.diagnostics?.map((diagnostic) => diagnostic.message) ?? [];
        setBackendDiagnostics(diagnostics);
        setCvxpyMetadata(response.metadata ?? {});
        setDiagnosticsStale(false);
        setLastAction(
          diagnostics.length === 0
            ? "Backend validation passed."
            : `Backend validation returned ${diagnostics.length} diagnostics.`
        );
      } catch (error) {
        setBackendStatus("unavailable");
        setCvxpyMetadata({});
        setBackendDiagnostics([error instanceof Error ? error.message : "Backend validation failed."]);
        setDiagnosticsStale(false);
        setLastAction("Backend unavailable; local workbench remains usable.");
      }
      return;
    }

    if (action === "generateCode") {
      setGeneratedCode((current) => ({
        status: "loading",
        previous: current.status === "success" ? current.code : "previous" in current ? current.previous : null,
        stale: current.status === "success" ? current.stale : "stale" in current ? current.stale : false
      }));
      try {
        const response = await generateAtlasCode(currentIR);
        setBackendStatus("connected");
        const code = typeof response.code === "string" ? response.code : "";
        const diagnostics = response.diagnostics?.map((diagnostic) => diagnostic.message) ?? [];
        setBackendDiagnostics(diagnostics);
        setGeneratedCode({ status: "success", code: code || "# Backend returned no code.", stale: false });
        setLastAction(diagnostics.length === 0 ? "Generated CVXPY code." : `Generated code with ${diagnostics.length} diagnostics.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Backend code generation failed.";
        setBackendStatus("unavailable");
        setBackendDiagnostics([message]);
        setGeneratedCode((current) => ({
          status: "error",
          message,
          previous: current.status === "success" ? current.code : "previous" in current ? current.previous : null,
          stale: current.status === "success" ? current.stale : "stale" in current ? current.stale : false
        }));
        setLastAction("Backend unavailable; code was not generated.");
      }
      return;
    }

    if (action === "export") {
      downloadAtlasIR(currentIR);
      setLastAction(PLACEHOLDER_ACTION_LABELS.export);
      return;
    }

    if (action === "import") {
      importInputRef.current?.click();
      setLastAction("Choose an Atlas IR JSON file to import.");
      return;
    }

    if (action === "saveProject") {
      downloadJson(
        serializeAtlasProject(createAtlasProjectFile(workbench)),
        "atlas-project.json"
      );
      setLastAction(PLACEHOLDER_ACTION_LABELS.saveProject);
      return;
    }

    if (action === "loadProject") {
      projectInputRef.current?.click();
      setLastAction("Choose an Atlas project JSON file to load.");
      return;
    }

    if (action === "loadExample") {
      dispatch({ type: "workbench.load", state: createProductionPlanningExample() });
      setEvaluationReport(null);
      setBackendDiagnostics([]);
      setLastAction(PLACEHOLDER_ACTION_LABELS.loadExample);
      return;
    }

    if (action === "tutorial") {
      tutorialAppliedRef.current.clear();
      setTutorialSteps(ATLAS_TUTORIAL_STEPS);
      setTutorial(createTutorialSession());
      setLastAction("Tutorial opened.");
      return;
    }

    if (action === "examples") {
      setExamplesOpen(true);
      setLastAction("Opened built-in examples.");
      return;
    }

    if (action === "search") {
      setSearchOpen(true);
    } else if (action === "undo") {
      dispatch({ type: "history.undo" });
    } else if (action === "redo") {
      dispatch({ type: "history.redo" });
    } else if (action === "clear") {
      dispatch({ type: "workbench.clear" });
    }

    setLastAction(PLACEHOLDER_ACTION_LABELS[action]);
  }

  function selectAtlasSource(sourceId: string) {
    const card = workbench.cards.find((candidate) => candidate.id === sourceId || candidate.modelObjectId === sourceId);
    if (card) {
      dispatch({ type: "card.select", cardId: card.id });
      setActiveView("object");
      setLastAction(`Selected ${card.title} from diagnostics.`);
    } else {
      setLastAction(`No workspace node found for ${sourceId}.`);
    }
  }

  function runPaletteCommand(commandId: AtlasCommandId) {
    if (commandId.startsWith("create:")) {
      createCard(commandId.slice("create:".length) as AtlasCardType);
      return;
    }
    if (commandId.startsWith("template:")) {
      createCardFromTemplate(commandId.slice("template:".length));
      return;
    }
    void handleToolbarAction(commandId as AtlasToolbarAction);
  }

  function contextMenuItems(menu: AtlasContextMenuState | null): AtlasContextMenuItem[] {
    if (!menu) return [];
    if (menu.kind === "canvas") {
      return [
        { id: "create-variable", label: "Create Variable" },
        { id: "create-parameter", label: "Create Parameter" },
        { id: "create-constant", label: "Create Constant" },
        { id: "create-atom", label: "Create Atom" },
        { id: "create-constraint", label: "Create Constraint" },
        { id: "create-objective", label: "Create Objective" },
        { id: "paste", label: "Paste", disabled: true },
        { id: "reset-view", label: "Reset view / center view", disabled: true }
      ];
    }
    if (menu.kind === "connection") {
      return [
        { id: "delete-connection", label: "Delete connection", destructive: true },
        { id: "inspect-connection", label: "Inspect connection" },
        { id: "highlight-connection", label: "Highlight source and target" }
      ];
    }
    if (menu.kind === "explorer") {
      return [
        { id: "place-reference", label: "Place reference on workspace" },
        { id: "rename-canonical", label: "Rename canonical object" },
        { id: "delete-canonical", label: "Delete canonical object", destructive: true },
        { id: "show-references", label: "Show all workspace references" },
        { id: "validate-object", label: "Validate" },
        { id: "evaluate-object", label: "Evaluate if applicable" }
      ];
    }
    return [
      { id: "rename", label: "Rename" },
      { id: "duplicate-reference", label: "Duplicate visual reference" },
      { id: "delete-reference", label: "Delete visual reference", destructive: true },
      { id: "delete-canonical", label: "Delete canonical object", destructive: true },
      { id: "open-inspector", label: "Open in Inspector" },
      { id: "show-dependencies", label: "Show dependencies" },
      { id: "show-references", label: "Show all references to same canonical object" },
      { id: "copy-reference", label: "Create reference / copy reference" },
      { id: "validate-object", label: "Validate selected object" },
      { id: "evaluate-object", label: "Evaluate selected object" },
      { id: "generate-selected-code", label: "Generate code for selected object", disabled: true },
      { id: "fit-dependencies", label: "Fit view to dependencies", disabled: true }
    ];
  }

  function handleContextMenuAction(itemId: string) {
    const menu = contextMenu;
    if (!menu) return;
    setContextMenu(null);
    if (menu.kind === "canvas") {
      const position = menu.position;
      if (itemId === "create-variable") dispatch({ type: "modelObject.define", objectKind: "variable", name: "x", position });
      if (itemId === "create-parameter") dispatch({ type: "modelObject.define", objectKind: "parameter", name: "p", position });
      if (itemId === "create-constant") dispatch({ type: "modelObject.define", objectKind: "constant", name: "c", position });
      if (itemId === "create-constraint") dispatch({ type: "modelObject.define", objectKind: "constraint", name: "constraint", position });
      if (itemId === "create-objective") dispatch({ type: "modelObject.define", objectKind: "objective", name: "objective", position });
      if (itemId === "create-atom") {
        const atomSpec = atomSpecs[0];
        if (atomSpec) {
          dispatch({
            type: "modelObject.define",
            objectKind: "atom",
            name: atomSpec.displayName ?? atomSpec.name,
            atomSpec,
            position
          });
        }
      }
      setLastAction(`Context menu action: ${itemId}.`);
      return;
    }
    if (menu.kind === "connection") {
      const connection = workbench.connections.find((candidate) => candidate.id === menu.connectionId);
      if (itemId === "delete-connection") {
        dispatch({ type: "connection.delete", connectionId: menu.connectionId });
        setLastAction("Deleted connection.");
      } else if (itemId === "highlight-connection" && connection?.source.nodeId) {
        dispatch({ type: "card.select", cardId: connection.source.nodeId });
        setLastAction("Selected connection source. Target remains connected visually.");
      } else {
        setLastAction(connection ? `Connection ${connection.id}: ${connection.source.port ?? "out"} -> ${connection.target.slot ?? "in"}.` : "Connection not found.");
      }
      return;
    }
    const modelObjectId = menu.kind === "explorer"
      ? menu.modelObjectId
      : workbench.cards.find((card) => card.id === menu.cardId)?.modelObjectId ?? menu.cardId;
    const referenceCard = workbench.cards.find((card) => (card.modelObjectId ?? card.id) === modelObjectId);
    if (itemId === "place-reference" || itemId === "copy-reference" || itemId === "duplicate-reference") {
      if (menu.kind === "node") {
        dispatch({ type: "workspaceReference.duplicate", cardId: menu.cardId, position: { x: 920, y: 720 } });
      } else {
        dispatch({ type: "workspaceReference.create", modelObjectId, position: { x: 920, y: 720 } });
      }
      setLastAction("Placed workspace reference.");
      return;
    }
    if (itemId === "delete-reference" && menu.kind === "node") {
      dispatch({ type: "card.delete", cardId: menu.cardId });
      setLastAction("Deleted visual reference. Canonical object remains in Explorer.");
      return;
    }
    if (itemId === "delete-canonical") {
      if (window.confirm(`Delete canonical object ${modelObjectId} and all its workspace references?`)) {
        dispatch({ type: "modelObject.delete", modelObjectId });
        setLastAction("Deleted canonical object and its references.");
      }
      return;
    }
    if (itemId === "rename" || itemId === "rename-canonical") {
      const nextTitle = window.prompt("Rename canonical object", referenceCard?.title ?? modelObjectId);
      if (nextTitle) {
        dispatch({ type: "modelObject.rename", modelObjectId, title: nextTitle });
        setLastAction(`Renamed ${modelObjectId}.`);
      }
      return;
    }
    if (itemId === "open-inspector" && menu.kind === "node") {
      dispatch({ type: "card.select", cardId: menu.cardId });
      setLastAction("Opened object in Inspector.");
      return;
    }
    if (itemId === "show-dependencies") {
      setDependencyHighlightEnabled(true);
      if (referenceCard) dispatch({ type: "card.select", cardId: referenceCard.id });
      setLastAction("Dependency highlighting enabled for selected object.");
      return;
    }
    if (itemId === "show-references") {
      const count = workbench.cards.filter((card) => (card.modelObjectId ?? card.id) === modelObjectId).length;
      if (referenceCard) dispatch({ type: "card.select", cardId: referenceCard.id });
      setLastAction(`${count} workspace reference(s) point to ${modelObjectId}.`);
      return;
    }
    if (itemId === "validate-object") {
      if (referenceCard) dispatch({ type: "card.select", cardId: referenceCard.id });
      void handleToolbarAction("inspect");
      return;
    }
    if (itemId === "evaluate-object") {
      if (referenceCard) dispatch({ type: "card.select", cardId: referenceCard.id });
      void handleToolbarAction("evaluate");
    }
  }

  return (
    <div className="atlas-app-shell">
      <AtlasToolbar
        onAction={handleToolbarAction}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          file
            .text()
            .then((text) => {
              const result = importAtlasIR(JSON.parse(text));
              if (result.diagnostics.length > 0) {
                setLastAction(`Import failed: ${result.diagnostics.join(" ")}`);
                return;
              }
              dispatch({ type: "workbench.load", state: result.state });
              setGeneratedCode({ status: "empty" });
              setDiagnosticsStale(true);
              setLastAction("Imported Atlas IR JSON.");
            })
            .catch((error) => {
              setLastAction(error instanceof Error ? error.message : "Import failed.");
            })
            .finally(() => {
              event.currentTarget.value = "";
            });
        }}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          file
            .text()
            .then((text) => {
              const result = importAtlasProject(JSON.parse(text));
              if (result.diagnostics.length > 0) {
                setLastAction(`Project load failed: ${result.diagnostics.join(" ")}`);
                return;
              }
              dispatch({ type: "workbench.load", state: result.state });
              setEvaluationReport(null);
              setGeneratedCode({ status: "empty" });
              setDiagnosticsStale(true);
              setLastAction("Loaded Atlas project JSON.");
            })
            .catch((error) => {
              setLastAction(error instanceof Error ? error.message : "Project load failed.");
            })
            .finally(() => {
              event.currentTarget.value = "";
            });
        }}
      />

      <main className="atlas-main-layout" aria-label="Atlas Optimization Suite workbench">
        <AtlasConstructorPanel
          cards={workbench.cards}
          templates={ATLAS_CARD_TEMPLATES}
          atomSpecs={atomSpecs}
          atomRegistryStatus={atomRegistryStatus}
          onCreateCard={createCard}
          onCreateFromTemplate={createCardFromTemplate}
          onCreateGroup={createGroup}
          onDefineModelObject={(objectKind, name, shape, atomSpec) => {
            dispatch({ type: "modelObject.define", objectKind, name, shape, atomSpec });
            setLastAction(`Defined ${objectKind} ${name.trim() || "object"}.`);
          }}
          onCreateWorkspaceReference={(modelObjectId) => {
            dispatch({ type: "workspaceReference.create", modelObjectId });
            setLastAction(`Placed reference to ${modelObjectId}.`);
          }}
          onExplorerContextMenu={(event, modelObjectId) => {
            setContextMenu({ kind: "explorer", x: event.clientX, y: event.clientY, modelObjectId });
          }}
        />

        <section className="atlas-workbench-column">
          <AtlasViewTabs activeView={activeView} onChange={setActiveView} />
          <div className="atlas-view-content">
            {activeView === "object" && (
              <>
                <AtlasWorkbench
                  cards={workbench.cards}
                  groups={workbench.groups}
                  queries={workbench.queries}
                  connections={workbench.connections}
                  highlightedCardIds={highlightedCardIds}
                  dependencyPropertyNamesByCardId={dependencyPropertyNamesByCardId}
                  diagnosticsByCardId={diagnosticsByCardId}
                  metadataByCardId={cvxpyMetadata}
                  selectedCardId={workbench.selectedCardId}
                  selectedGroupId={workbench.selectedGroupId}
                  onSelectCard={(cardId) => {
                    dispatch({ type: "card.select", cardId });
                    setFocusedObjectiveTermId(null);
                  }}
                  onSelectGroup={(groupId) => dispatch({ type: "group.select", groupId })}
                  onMoveCard={(cardId, position) => dispatch({ type: "card.move", cardId, position })}
                  onCreateWorkspaceReference={(modelObjectId, position) => {
                    dispatch({ type: "workspaceReference.create", modelObjectId, position });
                    setLastAction(`Placed reference to ${modelObjectId}.`);
                  }}
                  onCreateAtomFromSpec={(atomSpec, position) => {
                    dispatch({
                      type: "modelObject.define",
                      objectKind: "atom",
                      name: atomSpec.displayName ?? atomSpec.name,
                      shape: "scalar",
                      atomSpec,
                      position
                    });
                    setLastAction(`Defined CVXPY atom ${atomSpec.displayName ?? atomSpec.name}.`);
                  }}
                  onCreateConnection={(source, target) => {
                    dispatch({ type: "connection.create", source, target });
                    setLastAction(`Connected ${source.port ?? "output"} to ${target.slot ?? "input"}.`);
                  }}
                  onAttachModule={(cardId, kind, position) => {
                    dispatch({ type: "module.attach", cardId, kind, position });
                    setLastAction(`Attached ${kind} module.`);
                  }}
                  onMoveModule={(cardId, moduleId, position) => {
                    dispatch({ type: "module.update", cardId, moduleId, patch: { position } });
                  }}
                  onSelectDiagnostic={(diagnostic) => {
                    setSelectedRuntimeDiagnostic(diagnostic);
                    dispatch({ type: "card.select", cardId: diagnostic.cardId });
                    setLastAction(`Selected diagnostic ${diagnostic.label}.`);
                  }}
                  onNodeContextMenu={(event, card) => {
                    setContextMenu({ kind: "node", x: event.clientX, y: event.clientY, cardId: card.id });
                  }}
                  onCanvasContextMenu={(event, position) => {
                    setContextMenu({ kind: "canvas", x: event.clientX, y: event.clientY, position });
                  }}
                  onConnectionContextMenu={(event, connection) => {
                    setContextMenu({ kind: "connection", x: event.clientX, y: event.clientY, connectionId: connection.id });
                  }}
                />
                <AtlasModelDock cards={workbench.cards} />
              </>
            )}
            {activeView === "ir" && (
              <AtlasIRView ir={currentIR} onExport={() => void handleToolbarAction("export")} onImport={() => void handleToolbarAction("import")} />
            )}
            {activeView === "code" && (
              <AtlasCodeView
                codeState={generatedCode}
                solution={solution}
                backendStatus={backendStatus}
                onGenerateCode={() => void handleToolbarAction("generateCode")}
              />
            )}
            {activeView === "solution" && (
              <AtlasSolutionView
                solution={solution}
                onSolve={() => void handleToolbarAction("solve")}
                onSelectVariable={(variableId) => {
                  const target = resolveSolutionVariableTarget(variableId, workbench.cards);
                  if (target.cardId) {
                    dispatch({ type: "card.select", cardId: target.cardId });
                    setActiveView("object");
                    setLastAction(`Selected ${target.cardId} from solution.`);
                  } else {
                    setLastAction(`No card mapping found for ${variableId}.`);
                  }
                }}
                onSelectConstraint={selectAtlasSource}
              />
            )}
            {activeView === "diagnostics" && (
              <AtlasDiagnosticsView
                diagnostics={viewDiagnostics}
                stale={diagnosticsStale}
                onValidate={() => void handleToolbarAction("inspect")}
                onSelectSource={selectAtlasSource}
              />
            )}
          </div>
        </section>

        <aside className="atlas-side-panel" aria-label="Inspector and solution panel">
          <AtlasInspector
            card={selectedCard}
            group={selectedGroup}
            cards={workbench.cards}
            queries={workbench.queries}
            evaluationEntry={selectedEvaluationEntry}
            evaluationMode={evaluationMode}
            solutionEvaluationWarning={solutionWarning}
            selectedRuntimeDiagnostic={selectedRuntimeDiagnostic}
            symbolicPreview={selectedSymbolicPreview}
            cvxpyMetadata={selectedCvxpyMetadata}
            dependencyHighlightEnabled={dependencyHighlightEnabled}
            onAddTag={(cardId, key, value) => {
              dispatch({ type: "tag.add", cardId, key, value });
              setLastAction(`Added tag ${key.trim()}.`);
            }}
            onUpdateTag={(cardId, tagId, key, value) => {
              dispatch({ type: "tag.update", cardId, tagId, key, value });
              setLastAction(`Updated tag ${key.trim()}.`);
            }}
            onDeleteTag={(cardId, tagId) => {
              dispatch({ type: "tag.delete", cardId, tagId });
              setLastAction("Deleted tag.");
            }}
            onUpdateCardDetails={(cardId, patch) => {
              dispatch({ type: "card.update", cardId, patch });
              setLastAction("Updated card details.");
            }}
            onAddProperty={(cardId, property) => {
              dispatch({ type: "property.add", cardId, ...property });
              setLastAction(`Added property ${property.name.trim()}.`);
            }}
            onUpdateProperty={(cardId, propertyId, property) => {
              dispatch({ type: "property.update", cardId, propertyId, ...property });
              setLastAction(`Updated property ${property.name.trim()}.`);
            }}
            onDeleteProperty={(cardId, propertyId) => {
              dispatch({ type: "property.delete", cardId, propertyId });
              setLastAction("Deleted property.");
            }}
            onUpdateModule={(cardId, moduleId, patch) => {
              dispatch({ type: "module.update", cardId, moduleId, patch });
              setLastAction("Updated module.");
            }}
            onDeleteModule={(cardId, moduleId) => {
              dispatch({ type: "module.delete", cardId, moduleId });
              setLastAction("Deleted module.");
            }}
            onUpdateTaggedSum={(cardId, patch) => {
              dispatch({ type: "function.taggedSum.update", cardId, patch });
              setLastAction("Updated TaggedSum function.");
            }}
            onUpdateAtomInput={(cardId, inputKind, inputId, patch) => {
              dispatch({ type: "atom.input.update", cardId, inputKind, inputId, patch });
              setLastAction("Updated atom input.");
            }}
            onUpdateObjective={(cardId, patch) => {
              dispatch({ type: "objective.update", cardId, patch });
              setLastAction("Updated objective.");
            }}
            onAddObjectiveTerm={(cardId, functionCardId) => {
              dispatch({ type: "objective.term.add", cardId, functionCardId });
              setLastAction("Added objective term.");
            }}
            onUpdateObjectiveTerm={(cardId, termId, name, functionCardId) => {
              dispatch({ type: "objective.term.update", cardId, termId, name, functionCardId });
              setFocusedObjectiveTermId(termId);
              setLastAction("Updated objective term.");
            }}
            onRemoveObjectiveTerm={(cardId, termId) => {
              dispatch({ type: "objective.term.remove", cardId, termId });
              setFocusedObjectiveTermId(null);
              setLastAction("Removed objective term.");
            }}
            onMoveObjectiveTerm={(cardId, termId, direction) => {
              dispatch({ type: "objective.term.move", cardId, termId, direction });
              setFocusedObjectiveTermId(termId);
              setLastAction("Reordered objective term.");
            }}
            onFocusObjectiveTerm={(termId) => {
              setFocusedObjectiveTermId(termId);
              setLastAction(termId ? "Focused objective term dependencies." : "Showing objective dependencies.");
            }}
            onUpdateConstraint={(cardId, patch) => {
              dispatch({ type: "constraint.update", cardId, patch });
              setLastAction("Updated constraint.");
            }}
            onToggleDependencyHighlight={() => {
              setDependencyHighlightEnabled((enabled) => !enabled);
              setLastAction("Toggled dependency highlighting.");
            }}
            onUpdateGroup={(groupId, patch) => {
              dispatch({ type: "group.update", groupId, patch });
              setLastAction("Updated group.");
            }}
            onDeleteGroup={(groupId) => {
              dispatch({ type: "group.delete", groupId });
              setLastAction("Deleted group.");
            }}
            onDeleteCard={(cardId) => {
              dispatch({ type: "card.delete", cardId });
              setLastAction("Deleted selected card.");
            }}
            onClear={() => {
              dispatch({ type: "workbench.clear" });
              setLastAction(PLACEHOLDER_ACTION_LABELS.clear);
            }}
          />
          <AtlasQueryBuilder
            cards={workbench.cards}
            queries={workbench.queries}
            selectedQueryId={workbench.selectedQueryId}
            onCreateQuery={() => {
              dispatch({ type: "query.create" });
              setLastAction("Created query.");
            }}
            onSelectQuery={(queryId) => {
              dispatch({ type: "query.select", queryId });
              setLastAction(queryId ? "Selected query." : "Cleared query selection.");
            }}
            onUpdateQuery={(queryId, name) => {
              dispatch({ type: "query.update", queryId, patch: { name } });
              setLastAction("Updated query.");
            }}
            onDuplicateQuery={(queryId) => {
              dispatch({ type: "query.duplicate", queryId });
              setLastAction("Duplicated query.");
            }}
            onDeleteQuery={(queryId) => {
              dispatch({ type: "query.delete", queryId });
              setLastAction("Deleted query.");
            }}
            onAddCondition={(queryId, list, key, value) => {
              dispatch({ type: "query.condition.add", queryId, list, key, value });
              setLastAction("Added query condition.");
            }}
            onUpdateCondition={(queryId, list, conditionId, key, value) => {
              dispatch({ type: "query.condition.update", queryId, list, conditionId, key, value });
              setLastAction("Updated query condition.");
            }}
            onDeleteCondition={(queryId, list, conditionId) => {
              dispatch({ type: "query.condition.delete", queryId, list, conditionId });
              setLastAction("Deleted query condition.");
            }}
          />
          <AtlasPropertySelector
            cards={workbench.cards}
            queries={workbench.queries}
            selectedQueryId={workbench.selectedQueryId}
          />
          <section className="atlas-panel atlas-evaluation-mode-panel" aria-label="Evaluation mode">
            <header>
              <p className="atlas-eyebrow">Evaluate</p>
              <h2>Evaluation mode</h2>
            </header>
            <label className="atlas-evaluation-mode-control">
              <span>Mode</span>
              <select
                value={evaluationMode}
                onChange={(event) => {
                  setEvaluationMode(event.currentTarget.value as AtlasEvaluationMode);
                  setLastAction(`Evaluation mode set to ${event.currentTarget.value}.`);
                }}
              >
                <option value="current">Current values / initialization</option>
                <option
                  value="solution"
                  disabled={Object.keys(solutionRuntimeValues(solution)).length === 0}
                >
                  Latest solution
                </option>
              </select>
            </label>
            {solutionWarning && <p className="atlas-stale-warning">{solutionWarning}</p>}
          </section>
          <AtlasSolutionPanel
            statusMessage={lastAction}
            updatedAt={updatedAt}
            backendStatus={backendStatus}
            backendDiagnostics={backendDiagnostics}
            solution={solution}
            onSelectVariable={(variableId) => {
              const target = resolveSolutionVariableTarget(variableId, workbench.cards);
              if (target.cardId) {
                dispatch({ type: "card.select", cardId: target.cardId });
                setLastAction(
                  target.propertyName
                    ? `Selected ${target.cardId}.${target.propertyName} from solution.`
                    : `Selected ${target.cardId} from solution.`
                );
              } else {
                setLastAction(`No card mapping found for ${variableId}.`);
              }
            }}
            onSelectConstraint={(constraintId) => {
              dispatch({ type: "card.select", cardId: constraintId });
              setLastAction(`Selected constraint ${constraintId}.`);
            }}
          />
        </aside>
      </main>

      {searchOpen && (
        <AtlasSearchPalette
          cards={workbench.cards}
          templates={ATLAS_CARD_TEMPLATES}
          onClose={() => {
            setSearchOpen(false);
            setLastAction("Search closed.");
          }}
          onSelectCard={(cardId) => {
            dispatch({ type: "card.select", cardId });
            setFocusedObjectiveTermId(null);
            setLastAction("Selected card from search.");
          }}
          onRunCommand={runPaletteCommand}
        />
      )}
      <AtlasContextMenu
        menu={contextMenu}
        items={contextMenuItems(contextMenu)}
        onSelect={handleContextMenuAction}
        onClose={() => setContextMenu(null)}
      />
      <AtlasTutorialPanel
        open={tutorial.open}
        step={tutorialSteps[tutorial.stepIndex] ?? null}
        stepIndex={tutorial.stepIndex}
        stepCount={tutorialSteps.length}
        onNext={() => setTutorial((current) => nextTutorialSession(current, tutorialSteps))}
        onBack={() => setTutorial((current) => previousTutorialSession(current))}
        onReset={() => {
          dispatch({ type: "workbench.load", state: tutorialResetState(workbench) });
          tutorialAppliedRef.current.clear();
          setTutorial(resetTutorialSession());
          setLastAction("Tutorial reset.");
        }}
        onExit={() => setTutorial((current) => ({ ...current, open: false }))}
      />
      <AtlasExamplesPanel
        open={examplesOpen}
        examples={ATLAS_BUILTIN_EXAMPLES}
        onLoad={(exampleId) => {
          dispatch({ type: "workbench.load", state: loadAtlasBuiltinExample(exampleId) });
          setExamplesOpen(false);
          setLastAction(`Loaded ${exampleId} example.`);
        }}
        onTutorial={(exampleId: AtlasBuiltinExampleId) => {
          tutorialAppliedRef.current.clear();
          setTutorialSteps(tutorialStepsForExample(exampleId));
          setTutorial(createTutorialSession());
          setExamplesOpen(false);
          setLastAction(`Started ${exampleId} guided tutorial.`);
        }}
        onClose={() => setExamplesOpen(false)}
      />
    </div>
  );
}

function summarizeBackendEvaluation(response: Record<string, unknown>) {
  const lines: string[] = [];
  for (const section of ["functions", "objectives"] as const) {
    const values = isRecord(response[section]) ? response[section] : {};
    for (const [id, entry] of Object.entries(values)) {
      if (isRecord(entry) && "value" in entry) {
        lines.push(`${section.slice(0, -1)} ${id}: ${String(entry.value)}`);
      }
    }
  }
  const constraints = isRecord(response.constraints) ? response.constraints : {};
  for (const [id, entry] of Object.entries(constraints)) {
    if (isRecord(entry)) {
      lines.push(
        `constraint ${id}: left=${String(entry.left)} right=${String(entry.right)} residual=${String(entry.residual)}`
      );
    }
  }
  return lines;
}

function diagnosticsFromEvaluationReport(report: AtlasEvaluationReport): AtlasRuntimeDiagnostic[] {
  const timestamp = new Date().toISOString();
  return Object.values(report.entries)
    .filter((entry) => entry.value || entry.diagnostics.length > 0)
    .map((entry) => ({
      cardId: entry.cardId,
      diagnosticId: "evaluation",
      label: "value",
      value: entry.value ? formatEvaluationDiagnosticValue(entry) : "unavailable",
      status: entry.diagnostics.some((diagnostic) => diagnostic.level === "error")
        ? "error"
        : entry.diagnostics.length > 0
          ? "warning"
          : "ok",
      source: "evaluate",
      timestamp
    }));
}

function diagnosticsFromSolveResult(
  result: ReturnType<typeof parseAtlasSolveResult>,
  workbench: AtlasWorkbenchState
): AtlasRuntimeDiagnostic[] {
  const timestamp = new Date().toISOString();
  const diagnostics: AtlasRuntimeDiagnostic[] = [];
  for (const [variableId, value] of Object.entries(result.variableValues)) {
    const target = resolveSolutionVariableTarget(variableId, workbench.cards);
    if (!target.cardId) continue;
    diagnostics.push({
      cardId: target.cardId,
      diagnosticId: `solve:${variableId}`,
      label: target.propertyName ? `${target.propertyName} solution` : "solution",
      value: value === null ? "n/a" : String(value),
      status: "ok",
      source: "solve",
      timestamp
    });
  }
  for (const [constraintId, constraint] of Object.entries(result.constraints ?? {})) {
    diagnostics.push({
      cardId: constraintId,
      diagnosticId: `solve:${constraintId}`,
      label: "residual",
      value: constraint.residual === null ? "n/a" : String(constraint.residual),
      status: constraint.satisfied === false ? "warning" : "ok",
      source: "solve",
      timestamp
    });
  }
  return diagnostics;
}

function formatEvaluationDiagnosticValue(entry: NonNullable<AtlasEvaluationReport["entries"][string]>) {
  if (!entry.value) return "unavailable";
  if (entry.value.kind === "number") return String(entry.value.value);
  return `${entry.value.left ?? "?"}/${entry.value.right ?? "?"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function downloadAtlasIR(ir: ReturnType<typeof exportAtlasIR>) {
  downloadJson(serializeAtlasIR(ir), "atlas-ir.json");
}

function downloadJson(contents: string, filename: string) {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
