import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import App, { getInitialAppView } from "../src/App";
import {
  addAtlasCard,
  addAtlasCardFromTemplate,
  addAtlasProperty,
  addAtlasTag,
  createAtlasWorkspaceReference,
  createAtlasCard,
  createAtlasProperty,
  createAtlasTag,
  clearAtlasDesk,
  deleteAtlasCanonicalObject,
  defineAtlasModelObject,
  deleteAtlasCard,
  deleteAtlasProperty,
  deleteAtlasTag,
  getWorkspaceCards,
  getCanonicalModelObjects,
  updateAtlasAtomInput,
  updateAtlasProperty,
  updateAtlasCardDetails,
  updateAtlasTag,
  moveAtlasCard
} from "../src/atlas/core/cards";
import {
  addAtlasGroup,
  createAtlasGroup,
  deleteAtlasGroup,
  updateAtlasGroup
} from "../src/atlas/core/groups";
import {
  createAtlasQuery,
  evaluateAtlasQuery,
  addAtlasQuery,
  addAtlasQueryCondition
} from "../src/atlas/core/queries";
import {
  buildLinearExpressionFromTerms,
  collectPropertyNamesForQuery,
  createLiteralExpression,
  createLinearTermDraft,
  createMultiplyExpression,
  createPropertyReferenceExpression,
  expressionPreview,
  validateLinearExpression,
  getMissingPropertyCards
} from "../src/atlas/core/expressions";
import {
  parseAtlasShapeDraft
} from "../src/atlas/core/modelDefinitions";
import { parseAtlasCsv } from "../src/atlas/core/csv";
import {
  createIndexSet,
  createRangeIndexSet,
  indexedPropertyLabel
} from "../src/atlas/core/indexSets";
import {
  attachAtlasModule,
  deleteAtlasModule,
  updateAtlasModule
} from "../src/atlas/core/modules";
import {
  markSolveDiagnosticsStale,
  upsertRuntimeDiagnostics
} from "../src/atlas/core/runtimeDiagnostics";
import {
  buildTaggedSumExpression,
  createTaggedSumConfig,
  getFunctionDependencySummary,
  getTaggedSumMatchingCards,
  getTaggedSumMissingPropertyCards,
  taggedSumPreview,
  updateTaggedSumConfig
} from "../src/atlas/core/functions";
import {
  addObjectiveTerm,
  createObjectiveConfig,
  getObjectiveDependencySummary,
  moveObjectiveTerm,
  objectivePreview,
  updateObjectiveConfig,
  updateObjectiveTerm
} from "../src/atlas/core/objectives";
import {
  constraintPreview,
  createConstantConstraintExpression,
  createConstraintConfig,
  createFunctionConstraintExpression,
  getConstraintDependencySummary,
  updateConstraintConfig
} from "../src/atlas/core/constraints";
import {
  addAtlasConnection,
  getInvalidAtlasConnections
} from "../src/atlas/core/connections";
import {
  evaluateAtlasWorkbench,
  evaluateExpression
} from "../src/atlas/core/evaluator";
import {
  renderCardSymbolicPreview,
  renderExpressionSymbol
} from "../src/atlas/core/symbolic";
import {
  addWorkspaceReferenceToIR,
  deleteWorkspaceNodeFromIR,
  exportAtlasIR,
  importAtlasIR,
  serializeAtlasIR,
  validateCvxpyFirstIR,
  validateAtlasIR
} from "../src/atlas/core/ir";
import { createProductionPlanningExample } from "../src/atlas/core/examples";
import {
  createAtlasProjectFile,
  importAtlasProject,
  serializeAtlasProject
} from "../src/atlas/core/project";
import {
  parseAtlasSolveResult,
  resolveSolutionVariableTarget,
  type AtlasSolutionState
} from "../src/atlas/core/solution";
import {
  createAtlasCommands,
  filterAtlasCommands,
  searchAtlasCards
} from "../src/atlas/core/search";
import {
  checkAtlasBackendHealth,
  evaluateAtlasModel,
  fetchCvxpyAtoms,
  generateAtlasCode,
  solveAtlasModel,
  validateAtlasModel
} from "../src/atlas/api/backendClient";
import { createLocalFastApiBackend } from "../src/atlas/execution/LocalFastApiBackend";
import { mockBackend } from "../src/atlas/execution/MockBackend";
import { createPyodideBackend } from "../src/atlas/execution/PyodideBackend";
import {
  EXECUTION_BACKENDS,
  colabExportBackend,
  generateColabNotebook,
  getExecutionBackend,
  isExecutionBackendId
} from "../src/atlas/execution";
import { FALLBACK_ATOM_SPECS } from "../src/atlas/core/atoms";
import {
  filterByCategory,
  filterByKind,
  getAllSymbols,
  getSymbolById,
  searchSymbols,
  symbolCatalogMetadata,
  atomSpecFromSymbolId
} from "../src/atlas/core/symbolCatalog";
import {
  ATLAS_BUILTIN_EXAMPLES,
  loadAtlasBuiltinExample
} from "../src/atlas/core/builtinExamples";
import { atlasReducer } from "../src/atlas/core/reducer";
import { normalizeAtlasState } from "../src/atlas/storage/localAtlasStorage";
import { getAtlasCardTemplate } from "../src/atlas/core/templates";
import type { AtlasWorkbenchState } from "../src/atlas/core/types";
import { AtlasApp } from "../src/atlas/ui/AtlasApp";
import { AtlasToolbar } from "../src/atlas/ui/AtlasToolbar";
import { AtlasConstructorPanel } from "../src/atlas/ui/constructor/AtlasConstructorPanel";
import { AtlasInspector } from "../src/atlas/ui/inspector/AtlasInspector";
import {
  ATLAS_COMMANDS,
  createAtlasCommandRegistry,
  isAtlasCommandEnabled
} from "../src/atlas/ui/appCommands";
import { buildAtlasMenus } from "../src/atlas/ui/appMenus";
import {
  ATLAS_VIEW_REGISTRY,
  nextAtlasView
} from "../src/atlas/ui/views/viewRegistry";
import {
  ATLAS_PANEL_REGISTRY,
  defaultAtlasPanelState,
  panelsForRegion,
  toggleAtlasPanel
} from "../src/atlas/ui/panels/panelRegistry";
import { contextMenuItemsForTarget } from "../src/atlas/ui/context/contextMenuRegistry";
import {
  closeAtlasDialog,
  openAtlasDialog
} from "../src/atlas/ui/dialogs/dialogState";
import { DialogHost } from "../src/atlas/ui/dialogs/DialogHost";
import {
  canvasPointFromClient,
  parseAtlasDragPayload
} from "../src/atlas/ui/workbench/dragDrop";
import { AtlasCardView } from "../src/atlas/ui/workbench/AtlasCardView";
import { AtlasAtomNode } from "../src/atlas/ui/workbench/AtlasAtomNode";
import { AtlasGroupView } from "../src/atlas/ui/workbench/AtlasGroupView";
import { nextDraggedAtlasPosition } from "../src/atlas/ui/workbench/AtlasWorkbench";
import { AtlasExpressionPreview } from "../src/atlas/ui/query/AtlasExpressionPreview";
import { AtlasSolutionPanel } from "../src/atlas/ui/solution/AtlasSolutionPanel";
import { AtlasSearchPalette } from "../src/atlas/ui/search/AtlasSearchPalette";
import { AtlasContextMenu } from "../src/atlas/ui/context/AtlasContextMenu";
import {
  executeTutorialAction,
  ATLAS_TUTORIAL_STEPS,
  createTutorialSession,
  markTutorialStepApplied,
  nextTutorialSession,
  pendingTutorialActions,
  previousTutorialSession,
  resetTutorialSession,
  tutorialStepsForExample,
  tutorialResetState
} from "../src/atlas/core/tutorial";
import { AtlasExamplesPanel } from "../src/atlas/ui/examples/AtlasExamplesPanel";
import { AtlasAtomLibraryDialog } from "../src/atlas/ui/symbols/AtlasAtomLibraryDialog";
import {
  AtlasCodeView,
  AtlasDiagnosticsView,
  AtlasIRView,
  AtlasSolutionView,
  AtlasViewTabs,
  buildAtlasViewDiagnostics
} from "../src/atlas/ui/views/AtlasMultiView";
import {
  REQUIRED_ATLAS_COMMAND_IDS,
  executeCommand,
  getCommand,
  isCommandEnabled
} from "../src/app/commands/commandRegistry";
import {
  commitTransaction,
  createUndoRedoStore,
  redo,
  undo
} from "../src/app/transactions/undoRedoStore";
import { createActionTransaction } from "../src/app/transactions/applyTransaction";
import { atlasEventLog } from "../src/app/debug/eventLog";
import {
  getCurrentSchemaVersion,
  migrateIr
} from "../src/atlas/core/atlasIr/migrations";

function emptyAtlasState(): AtlasWorkbenchState {
  return {
    cards: [],
    groups: [],
    queries: [],
    connections: [],
    selectedCardId: null,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

describe("Atlas app skeleton", () => {
  it("renders the Atlas Optimization Suite layout", () => {
    const html = renderToString(<AtlasApp />);

    expect(html).toContain("Atlas Optimization Suite");
    expect(html).toContain("Validate");
    expect(html).toContain("Evaluate");
    expect(html).toContain("Solve");
    expect(html).toContain("Export");
    expect(html).toContain("Save");
    expect(html).toContain("Load");
    expect(html).toContain("Undo");
    expect(html).toContain("Redo");
    expect(html).toContain("Search");
    expect(html).toContain("Tutorials");
    expect(html).toContain("Examples");
    expect(html).toContain("File");
    expect(html).toContain("Edit");
    expect(html).toContain("View");
    expect(html).toContain("Run");
    expect(html).toContain("Examples");
    expect(html).toContain("Tools");
    expect(html).toContain("Help");
    expect(html).toContain("Constructor");
    expect(html).toContain("Define...");
    expect(html).toContain("Explorer");
    expect(html).toContain("Build optimization problems from solver primitives.");
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

  it("renders an active command palette with search and commands", () => {
    const state = createProductionPlanningExample();
    const html = renderToString(
      <AtlasSearchPalette
        cards={state.cards}
        templates={[]}
        onClose={() => undefined}
        onSelectCard={() => undefined}
        onRunCommand={() => undefined}
      />
    );

    expect(html).toContain("Command palette");
    expect(html).toContain("Create Constant card");
    expect(html).toContain("Load linear CVXPY example");
    expect(html).toContain("Search Atlas model and commands");
    expect(html).not.toContain("disabled");
  });

  it("renders a backend-driven atom palette", () => {
    const atomSpecs = FALLBACK_ATOM_SPECS.filter((atomSpec) =>
      ["norm", "sum_squares"].includes(atomSpec.name)
    );
    const html = renderToString(
      <AtlasConstructorPanel
        cards={[]}
        templates={[]}
        atomSpecs={atomSpecs}
        atomRegistryStatus="Loaded 2 atoms from backend registry."
        onCreateCard={() => undefined}
        onCreateFromTemplate={() => undefined}
        onCreateGroup={() => undefined}
        onDefineModelObject={() => undefined}
        onCreateWorkspaceReference={() => undefined}
      />
    );

    expect(html).toContain("Loaded 2 atoms from backend registry.");
    expect(html).toContain("Define...");
    expect(html).toContain("Command / JSON snippet");
    expect(html).toContain("Add Atom...");
    expect(html).toContain("Variables");
    expect(html).toContain("Parameters");
    expect(html).toContain("norm");
    expect(html).toContain("sum_squares");
    expect(html.toLowerCase()).toContain("cvxpy");
  });

  it("defining a parameter creates a canonical object for Explorer", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "parameter", "lambda", "scalar");
    const canonical = getCanonicalModelObjects(state);

    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.title).toBe("lambda");
    expect(canonical[0]?.modelObjectKind).toBe("parameter");
    expect(canonical[0]?.workspaceRole).toBe("definition");
  });

  it("renders professional Atlas application menus", () => {
    const html = renderToString(
      <AtlasToolbar
        onAction={() => undefined}
        onViewChange={() => undefined}
        executionBackends={EXECUTION_BACKENDS}
        executionBackendId="mock"
        onExecutionBackendChange={() => undefined}
        canUndo={true}
        canRedo={false}
      />
    );

    expect(html).toContain("File");
    expect(html).toContain("New Model");
    expect(html).toContain("Clear Desk");
    expect(html).toContain("Save Project As");
    expect(html).toContain("Export CVXPY code");
    expect(html).toContain("Export to Colab notebook");
    expect(html).toContain("Edit");
    expect(html).toContain("Undo");
    expect(html).toContain("Delete Selected");
    expect(html).toContain("View");
    expect(html).toContain("Diagnostics View");
    expect(html).toContain("Run");
    expect(html).toContain("Execution backend");
    expect(html).toContain("Backend Health Check");
    expect(html).toContain("Mock");
    expect(html).toContain("Local FastAPI");
    expect(html).toContain("Browser/Pyodide");
    expect(html).toContain("Colab Export");
    expect(html).toContain("disabled");
    expect(html).toContain("Evaluate at solution");
    expect(html).toContain("Tiny LP");
    expect(html).toContain("Command Palette");
    expect(html).toContain("Help");
    expect(html).toContain("Keyboard Shortcuts");
  });

  it("clear desk removes visual references while preserving canonical definitions", () => {
    const withDefinition = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const canonicalId = withDefinition.cards[0]?.modelObjectId ?? "";
    const withReference = createAtlasWorkspaceReference(withDefinition, canonicalId);
    const cleared = clearAtlasDesk({
      ...withReference,
      groups: [createAtlasGroup()],
      connections: [
        {
          id: "connection-ref",
          source: { nodeId: withReference.cards[1]?.id, port: "value" },
          target: { nodeId: "missing-node", slot: "arg0" },
          semanticReference: { kind: "expression_input" }
        }
      ]
    });

    expect(cleared.cards).toHaveLength(1);
    expect(cleared.cards[0]?.workspaceRole).toBe("definition");
    expect(cleared.cards[0]?.modelObjectId).toBe(canonicalId);
    expect(getCanonicalModelObjects(cleared)).toHaveLength(1);
    expect(cleared.groups).toEqual([]);
    expect(cleared.connections).toEqual([]);
  });

  it("new model clears the entire workbench model", () => {
    const withDefinition = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const canonicalId = withDefinition.cards[0]?.modelObjectId ?? "";
    const withReference = createAtlasWorkspaceReference(withDefinition, canonicalId);
    const cleared = atlasReducer(withReference, { type: "workbench.clear" });

    expect(cleared.cards).toEqual([]);
    expect(cleared.connections).toEqual([]);
    expect(getCanonicalModelObjects(cleared)).toEqual([]);
  });

  it("renders a context menu with disabled and destructive actions", () => {
    const html = renderToString(
      <AtlasContextMenu
        menu={{ kind: "canvas", x: 10, y: 20, position: { x: 100, y: 200 } }}
        items={[
          { id: "create-variable", label: "Create Variable" },
          { id: "delete", label: "Delete canonical object", destructive: true },
          { id: "paste", label: "Paste", disabled: true }
        ]}
        onSelect={() => undefined}
        onClose={() => undefined}
      />
    );

    expect(html).toContain("Create Variable");
    expect(html).toContain("Delete canonical object");
    expect(html).toContain("disabled");
    expect(html).toContain("destructive");
  });
});

describe("Atlas execution backends", () => {
  it("loads the generated CVXPY symbol catalog asset", () => {
    const path = join(process.cwd(), "apps", "web", "src", "generated", "cvxpy_symbols.generated.json");
    const fallbackPath = join(process.cwd(), "src", "generated", "cvxpy_symbols.generated.json");
    const catalog = JSON.parse(readFileSync(existsSync(path) ? path : fallbackPath, "utf8")) as {
      symbols: Array<{ id: string; name: string; source: string }>;
    };

    expect(catalog.symbols.length).toBeGreaterThan(0);
    expect(catalog.symbols.some((symbol) => symbol.name === "norm")).toBe(true);
    expect(catalog.symbols.some((symbol) => symbol.id === "atlas.operator.add" && symbol.source === "pseudo")).toBe(true);
  });

  it("searches and filters the generated symbol catalog", () => {
    const metadata = symbolCatalogMetadata();
    const norm = searchSymbols("norm").find((symbol) => symbol.name === "norm");

    expect(metadata.symbolCount).toBeGreaterThan(0);
    expect(getAllSymbols().length).toBe(metadata.symbolCount);
    expect(norm?.id).toBeTruthy();
    expect(norm ? getSymbolById(norm.id)?.name : undefined).toBe("norm");
    expect(filterByKind("operator").some((symbol) => symbol.id === "atlas.operator.add")).toBe(true);
    expect(filterByCategory("Norms").some((symbol) => symbol.name === "norm")).toBe(true);
  });

  it("renders the Atom Library from the generated symbol catalog", () => {
    const html = renderToString(
      <AtlasAtomLibraryDialog onClose={() => undefined} onCreateSymbol={() => undefined} />
    );

    expect(html).toContain("CVXPY Atom Library");
    expect(html).toContain("norm");
    expect(html).toContain("Examples:");
  });

  it("registers deployment modes behind the ExecutionBackend boundary", () => {
    expect(EXECUTION_BACKENDS.map((backend) => backend.id)).toEqual([
      "mock",
      "local-fastapi",
      "browser-pyodide",
      "colab-export",
      "hosted-api"
    ]);
    expect(getExecutionBackend("mock").label).toBe("Mock");
    expect(getExecutionBackend("browser-pyodide").label).toBe("Browser/Pyodide");
    expect(isExecutionBackendId("colab-export")).toBe(true);
    expect(isExecutionBackendId("unknown")).toBe(false);
  });

  it("mock backend returns deterministic validation, code, and solution responses", async () => {
    const ir = exportAtlasIR(
      defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar"),
      { exportedAt: "2026-01-01T00:00:00.000Z" }
    );

    const validation = await mockBackend.validate(ir);
    const code = await mockBackend.generateCode(ir);
    const solution = await mockBackend.solve(ir);
    const variableId = ir.modelObjects.variables[0]?.id ?? "";

    expect(validation.diagnostics?.[0]?.message).toContain("Mock validation passed");
    expect(code.code).toContain("Mock backend generated code");
    expect(solution.status).toBe("mock-optimal");
    expect(solution.variableValues).toEqual({ [variableId]: 2 });
    expect(solution.diagnostics?.[0]?.message).toContain("Mock mode is active");
  });

  it("local FastAPI backend adapter calls centralized endpoints", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        json: async () => ({
          status: "ok",
          diagnostics: [],
          metadata: {},
          code: "problem.solve()"
        })
      } as Response;
    }) as typeof fetch;

    const backend = createLocalFastApiBackend();
    const ir = exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" });
    await backend.health?.();
    await backend.validate(ir);
    await backend.evaluate(ir, "current");
    await backend.generateCode(ir);
    await backend.solve(ir);

    globalThis.fetch = originalFetch;
    expect(calls).toEqual([
      "http://localhost:8000/health",
      "http://localhost:8000/validate",
      "http://localhost:8000/evaluate",
      "http://localhost:8000/generate_code",
      "http://localhost:8000/solve"
    ]);
  });

  it("local FastAPI backend adapter reports unavailable and invalid responses clearly", async () => {
    const originalFetch = globalThis.fetch;
    const backend = createLocalFastApiBackend();
    const ir = exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" });

    globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response) as typeof fetch;
    await expect(backend.solve(ir)).rejects.toThrow("Atlas backend /solve failed with HTTP 503.");

    globalThis.fetch = (async () => ({ ok: true, json: async () => [] }) as Response) as typeof fetch;
    await expect(backend.validate(ir)).rejects.toThrow("Invalid Local FastAPI validate response");

    globalThis.fetch = originalFetch;
  });

  it("keeps GUI view modules independent from local FastAPI deployment code", () => {
    const viewsDir = join(process.cwd(), "src", "atlas", "ui", "views");
    const root = existsSync(viewsDir) ? viewsDir : join(process.cwd(), "apps", "web", "src", "atlas", "ui", "views");
    const files = collectFiles(root);

    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toContain("LocalFastApiBackend");
      expect(readFileSync(file, "utf8")).not.toContain("backendClient");
    }
  });

  it("Pyodide backend exposes not-loaded, loading, ready, and error states without solving", async () => {
    let releaseRuntime: (() => void) | null = null;
    const pyodide = createPyodideBackend(
      () =>
        new Promise<void>((resolve) => {
          releaseRuntime = resolve;
        })
    );
    const ir = exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" });

    expect(pyodide.getRuntimeState().status).toBe("not-loaded");
    const loading = pyodide.loadRuntime();
    expect(pyodide.getRuntimeState().status).toBe("loading");
    releaseRuntime?.();
    await loading;
    expect(pyodide.getRuntimeState().status).toBe("ready");

    const solve = await pyodide.solve(ir);
    expect(solve.status).toBe("not_available");
    expect(solve.diagnostics?.[0]?.message).toContain("Browser/Pyodide solve is not ready");

    const broken = createPyodideBackend(() => Promise.reject(new Error("Pyodide failed")));
    await broken.loadRuntime();
    expect(broken.getRuntimeState().status).toBe("error");
    expect(broken.getRuntimeState().message).toBe("Pyodide failed");
  });

  it("generates a valid Colab notebook for Tiny LP", async () => {
    const ir = exportAtlasIR(loadAtlasBuiltinExample("tiny-lp"), {
      exportedAt: "2026-01-01T00:00:00.000Z"
    });
    const result = generateColabNotebook(ir);
    const notebook = JSON.parse(JSON.stringify(result.notebook)) as {
      nbformat: number;
      cells: Array<{ cell_type: string; source: string[] }>;
    };
    const source = notebook.cells.flatMap((cell) => cell.source).join("");

    expect(result.filename).toBe("atlas_tiny_lp.ipynb");
    expect(notebook.nbformat).toBe(4);
    expect(notebook.cells.some((cell) => cell.cell_type === "markdown")).toBe(true);
    expect(source).toContain("import cvxpy as cp");
    expect(source).toContain("problem = cp.Problem(objective, constraints)");
    expect(source).toContain("problem.solve()");
    expect(source).toContain('print("status", problem.status)');
    expect(source).toContain("Expected result: x = 2, y = 2, objective = 10.");
  });

  it("ColabExportBackend generateCode uses the current IR and solve instructs export", async () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "custom_decision", "scalar");
    const ir = exportAtlasIR(state, { exportedAt: "2026-01-01T00:00:00.000Z" });
    const code = await colabExportBackend.generateCode(ir);
    const notebook = await colabExportBackend.exportNotebook?.(ir);
    const solve = await colabExportBackend.solve(ir);

    expect(code.code).toContain("custom_decision");
    expect(code.code).not.toContain("x = cp.Variable");
    expect(notebook?.filename).toMatch(/^atlas_.*\.ipynb$/);
    expect(JSON.parse(notebook?.content ?? "{}").nbformat).toBe(4);
    expect(solve.status).toBe("not_available");
    expect(solve.diagnostics?.[0]?.message).toContain("Export and run in Colab");
  });
});

describe("Atlas central command architecture", () => {
  it("registers all required canonical commands", () => {
    for (const commandId of REQUIRED_ATLAS_COMMAND_IDS) {
      expect(getCommand(commandId)?.id).toBe(commandId);
    }
  });

  it("evaluates enabled predicates for delete, undo, redo, and solve", () => {
    const empty = emptyAtlasState();
    const selected = { ...empty, selectedCardId: "node-x" };

    expect(isCommandEnabled("edit.deleteSelected", { state: empty })).toBe(false);
    expect(isCommandEnabled("edit.deleteSelected", { state: selected })).toBe(true);
    expect(isCommandEnabled("edit.undo", { state: empty, canUndo: false })).toBe(false);
    expect(isCommandEnabled("edit.undo", { state: empty, canUndo: true })).toBe(true);
    expect(isCommandEnabled("edit.redo", { state: empty, canRedo: true })).toBe(true);
    expect(isCommandEnabled("run.solve", { state: empty, supportsSolve: false })).toBe(false);
    expect(isCommandEnabled("run.solve", { state: empty, supportsSolve: true })).toBe(true);
  });

  it("executes clearDesk through a transaction that preserves canonical objects", async () => {
    const withDefinition = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const canonicalId = withDefinition.cards[0]?.modelObjectId ?? "";
    const withReference = createAtlasWorkspaceReference(withDefinition, canonicalId);
    const result = await executeCommand("file.clearDesk", { state: withReference });

    expect(result.transaction).toBeTruthy();
    const cleared = result.transaction?.apply();
    expect(getCanonicalModelObjects(cleared!)).toHaveLength(1);
    expect(getWorkspaceCards(cleared!)).toHaveLength(0);
  });

  it("executes newModel through a transaction that clears all model state", async () => {
    const withDefinition = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const result = await executeCommand("file.newModel", { state: withDefinition });
    const cleared = result.transaction?.apply();

    expect(cleared?.cards).toEqual([]);
    expect(cleared?.connections).toEqual([]);
  });

  it("supports undo and redo for define, place reference, connect, and delete reference transactions", () => {
    let store = createUndoRedoStore(emptyAtlasState());
    store = commitTransaction(store, createActionTransaction("Define variable", store.present, {
      type: "modelObject.define",
      objectKind: "variable",
      name: "x"
    }));
    const modelObjectId = store.present.cards[0]?.modelObjectId ?? "";
    store = commitTransaction(store, createActionTransaction("Place reference", store.present, {
      type: "workspaceReference.create",
      modelObjectId
    }));
    const referenceId = getWorkspaceCards(store.present)[0]?.id ?? "";
    store = commitTransaction(store, createActionTransaction("Connect ports", store.present, {
      type: "connection.create",
      source: { nodeId: referenceId, port: "expression" },
      target: { nodeId: referenceId, slot: "input" }
    }));
    store = commitTransaction(store, createActionTransaction("Delete reference", store.present, {
      type: "card.delete",
      cardId: referenceId
    }));

    expect(getWorkspaceCards(store.present)).toHaveLength(0);
    store = undo(store);
    expect(getWorkspaceCards(store.present)).toHaveLength(1);
    store = undo(store);
    expect(store.present.connections).toHaveLength(0);
    store = redo(store);
    expect(store.present.connections).toHaveLength(1);
  });

  it("records command execution in the event log", async () => {
    atlasEventLog.clear();
    await executeCommand("model.defineVariable", { state: emptyAtlasState() }, { name: "z" });

    expect(atlasEventLog.entries.some((entry) => entry.commandId === "model.defineVariable")).toBe(true);
    expect(atlasEventLog.entries.some((entry) => entry.type === "transaction")).toBe(true);
  });
});

describe("Atlas IR migrations", () => {
  it("reports current schema version and migrates 0.2 IR to current", () => {
    const oldIr = exportAtlasIR(emptyAtlasState());
    const migrated = migrateIr({
      ...oldIr,
      schemaVersion: "0.2-cvxpy",
      metadata: { ...oldIr.metadata, schemaVersion: "0.2-cvxpy" }
    });

    expect(getCurrentSchemaVersion()).toBe("0.3.0");
    expect((migrated.ir as { schemaVersion?: string }).schemaVersion).toBe("0.3.0");
    expect(migrated.diagnostics.some((diagnostic) => diagnostic.includes("Migrated"))).toBe(true);
  });
});

function collectFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

describe("Atlas workbench interactions", () => {
  it("converts pointer drag deltas through the active zoom scale", () => {
    expect(
      nextDraggedAtlasPosition(
        { x: 100, y: 100 },
        { x: 10, y: 10 },
        { x: 30, y: 40 },
        0.5
      )
    ).toEqual({ x: 140, y: 160 });

    expect(
      nextDraggedAtlasPosition(
        { x: 100, y: 100 },
        { x: 10, y: 10 },
        { x: 30, y: 40 },
        2
      )
    ).toEqual({ x: 110, y: 115 });
  });
});

describe("Atlas multi-view workbench", () => {
  it("renders the synchronized Object, IR, Code, Solution, and Diagnostics tabs", () => {
    const html = renderToString(<AtlasViewTabs activeView="object" onChange={() => undefined} />);

    expect(html).toContain("Object");
    expect(html).toContain("IR");
    expect(html).toContain("CVXPY Code");
    expect(html).toContain("Solution");
    expect(html).toContain("Diagnostics");
    expect(html).toContain("aria-pressed=\"true\"");
  });

  it("keeps model state independent from tab switching", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const before = exportAtlasIR(state).modelObjects;

    renderToString(<AtlasViewTabs activeView="ir" onChange={() => undefined} />);
    renderToString(<AtlasViewTabs activeView="solution" onChange={() => undefined} />);

    expect(exportAtlasIR(state).modelObjects).toEqual(before);
  });

  it("renders current Atlas IR JSON in the IR view", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const ir = exportAtlasIR(state);
    const html = renderToString(<AtlasIRView ir={ir} onExport={() => undefined} onImport={() => undefined} />);

    expect(html).toContain("Current model JSON");
    expect(html).toContain("&quot;modelObjects&quot;");
    expect(html).toContain("&quot;variables&quot;");
    expect(html).toContain("&quot;x&quot;");
    expect(html).toContain("Export IR");
    expect(html).toContain("Import IR");
  });

  it("renders backend-generated code and unavailable code states", () => {
    const generated = renderToString(
      <AtlasCodeView
        codeState={{ status: "success", code: "import cvxpy as cp", stale: false }}
        solution={{ status: "empty" }}
        backendStatus="connected"
        onGenerateCode={() => undefined}
      />
    );
    const unavailable = renderToString(
      <AtlasCodeView
        codeState={{ status: "empty" }}
        solution={{ status: "empty" }}
        backendStatus="unavailable"
        onGenerateCode={() => undefined}
      />
    );

    expect(generated).toContain("import cvxpy as cp");
    expect(generated).toContain("Generate Code");
    expect(unavailable).toContain("Backend unavailable / code not generated.");
  });

  it("renders solution empty, loading, success, error, and stale states", () => {
    const successSolution = {
      status: "success" as const,
      stale: true,
      result: {
        status: "optimal",
        objectiveValue: 10,
        variableValues: { "var-x": 2, "var-y": [1, 2] },
        constraints: {},
        diagnostics: [],
        code: "problem.solve()"
      }
    };

    expect(
      renderToString(
        <AtlasSolutionView
          solution={{ status: "empty" }}
          onSolve={() => undefined}
          onSelectVariable={() => undefined}
          onSelectConstraint={() => undefined}
        />
      )
    ).toContain("No solve results yet.");
    expect(
      renderToString(
        <AtlasSolutionView
          solution={{ status: "loading", previous: successSolution.result }}
          onSolve={() => undefined}
          onSelectVariable={() => undefined}
          onSelectConstraint={() => undefined}
        />
      )
    ).toContain("Solving...");
    expect(
      renderToString(
        <AtlasSolutionView
          solution={successSolution}
          onSolve={() => undefined}
          onSelectVariable={() => undefined}
          onSelectConstraint={() => undefined}
        />
      )
    ).toContain("Solution is stale because the model changed after solving.");
    expect(
      renderToString(
        <AtlasSolutionView
          solution={{ status: "error", message: "Backend solve failed." }}
          onSolve={() => undefined}
          onSelectVariable={() => undefined}
          onSelectConstraint={() => undefined}
        />
      )
    ).toContain("Backend solve failed.");
  });

  it("aggregates and renders diagnostics with selectable sources", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const card = state.cards[0];
    if (!card) throw new Error("Expected card.");
    const diagnostics = buildAtlasViewDiagnostics({
      ir: exportAtlasIR(state),
      backendDiagnostics: ["Backend warning"],
      runtimeDiagnostics: [
        {
          cardId: card.id,
          diagnosticId: "diagnostic",
          label: "Current value",
          value: "missing",
          status: "warning",
          source: "validate"
        }
      ],
      solution: {
        status: "success",
        stale: false,
        result: {
          status: "optimal",
          objectiveValue: null,
          variableValues: {},
          diagnostics: [{ level: "error", message: "DCP error", sourceId: card.modelObjectId }],
          code: null
        }
      }
    });
    const html = renderToString(
      <AtlasDiagnosticsView diagnostics={diagnostics} stale={true} onValidate={() => undefined} onSelectSource={() => undefined} />
    );

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
      expect.arrayContaining(["Backend warning", "Current value: missing", "DCP error"])
    );
    expect(html).toContain("Diagnostics may be stale because the model changed.");
    expect(html).toContain("Backend warning");
    expect(html).toContain("Current value: missing");
    expect(html).toContain("DCP error");
  });

  it("validates the Least Squares showcase across Object, IR, Code, Solution, and Diagnostics views", () => {
    const state = loadAtlasBuiltinExample("least-squares");
    const ir = exportAtlasIR(state);
    const codeHtml = renderToString(
      <AtlasCodeView
        codeState={{
          status: "success",
          stale: false,
          code: "import cvxpy as cp\nimport numpy as np\nx = cp.Variable((2,), name=\"x\")\nA = np.array([[1, 0], [1, 1], [1, 2]])\nobjective = cp.Minimize(cp.sum_squares(A @ x - b))\nproblem = cp.Problem(objective, constraints)\nproblem.solve()"
        }}
        solution={{ status: "empty" }}
        backendStatus="connected"
        onGenerateCode={() => undefined}
      />
    );
    const solutionHtml = renderToString(
      <AtlasSolutionView
        solution={{
          status: "success",
          stale: false,
          result: {
            status: "optimal",
            objectiveValue: 0.1667,
            variableValues: { "var-x": [1.1667, 0.5] },
            constraints: {},
            diagnostics: [],
            code: "problem.solve()"
          }
        }}
        onSolve={() => undefined}
        onSelectVariable={() => undefined}
        onSelectConstraint={() => undefined}
      />
    );
    const diagnosticsHtml = renderToString(
      <AtlasDiagnosticsView
        diagnostics={[
          { id: "metadata-var-x", level: "info", message: "shape [2], curvature AFFINE, DCP true", sourceId: "var-x" },
          { id: "metadata-loss", level: "info", message: "sum_squares is convex and DCP", sourceId: "atom-loss" }
        ]}
        stale={false}
        onValidate={() => undefined}
        onSelectSource={() => undefined}
      />
    );

    expect(state.cards.map((card) => card.title)).toEqual(
      expect.arrayContaining(["x", "A", "b", "A @ x", "A @ x - b", "sum_squares"])
    );
    expect(ir.modelObjects.variables.find((variable) => variable.id === "var-x")?.shape).toEqual([2]);
    expect(ir.modelObjects.constants.find((constant) => constant.id === "const-A")?.value).toEqual([
      [1, 0],
      [1, 1],
      [1, 2]
    ]);
    expect(ir.modelObjects.atoms.map((atom) => atom.importPath)).toEqual(
      expect.arrayContaining(["atlas.expression.matmul", "atlas.expression.subtract", "cvxpy.sum_squares"])
    );
    expect(ir.workspaceNodes.length).toBeGreaterThan(0);
    expect(ir.connections.length).toBeGreaterThan(0);
    expect(renderToString(<AtlasIRView ir={ir} onExport={() => undefined} onImport={() => undefined} />)).toContain("&quot;modelObjects&quot;");
    expect(codeHtml).toContain("cp.Variable");
    expect(codeHtml).toContain("np.array");
    expect(codeHtml).toContain("problem.solve()");
    expect(solutionHtml).toContain("optimal");
    expect(solutionHtml).toContain("[1.167, 0.5]");
    expect(diagnosticsHtml).toContain("DCP true");
    expect(diagnosticsHtml).toContain("curvature AFFINE");
  });
});

describe("Atlas tutorial framework", () => {
  it("advances, goes back, and resets tutorial session state", () => {
    const session = createTutorialSession();
    const advanced = nextTutorialSession(session);
    const backedUp = previousTutorialSession(advanced);
    const reset = resetTutorialSession();

    expect(session.open).toBe(true);
    expect(advanced.stepIndex).toBe(1);
    expect(backedUp.stepIndex).toBe(0);
    expect(reset.stepIndex).toBe(0);
    expect(ATLAS_TUTORIAL_STEPS.length).toBeGreaterThan(1);
  });

  it("returns pending tutorial actions once per step", () => {
    const session = createTutorialSession();
    const actions = pendingTutorialActions(session);
    const applied = markTutorialStepApplied(session, ATLAS_TUTORIAL_STEPS[0]?.id ?? "");

    expect(actions.some((action) => action.type === "dispatch")).toBe(true);
    expect(pendingTutorialActions(applied)).toEqual([]);
  });

  it("removes tutorial-created objects on reset without clearing user objects", () => {
    const user = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const tutorialState = defineAtlasModelObject(user, "variable", "tutorial_x", "scalar");
    const reset = tutorialResetState(tutorialState);

    expect(reset.cards.map((card) => card.title)).toContain("x");
    expect(reset.cards.map((card) => card.title)).not.toContain("tutorial_x");
  });

  it("loads built-in example scripts for LP, least squares, and ridge regression", () => {
    expect(ATLAS_BUILTIN_EXAMPLES.map((example) => example.id)).toEqual([
      "tiny-lp",
      "least-squares",
      "ridge-regression"
    ]);

    for (const example of ATLAS_BUILTIN_EXAMPLES) {
      const state = loadAtlasBuiltinExample(example.id);
      const ir = exportAtlasIR(state);
      const steps = tutorialStepsForExample(example.id);

      expect(state.cards.length).toBeGreaterThan(0);
      expect(ir.modelObjects.problems.length).toBe(1);
      expect(ir.connections.length).toBeGreaterThan(0);
      if (example.id === "least-squares" || example.id === "ridge-regression") {
        expect(ir.modelObjects.variables.find((variable) => variable.id === "var-x")?.shape).toEqual([2]);
        expect(ir.modelObjects.constants.find((constant) => constant.id === "const-A")?.value).toEqual([
          [1, 0],
          [1, 1],
          [1, 2]
        ]);
      }
      expect(steps[0]?.actions).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "loadExample", exampleId: example.id })])
      );
      expect(steps.some((step) => step.actions.some((action) => action.type === "generateCode"))).toBe(true);
      expect(steps.at(-1)?.actions.some((action) => action.type === "solve")).toBe(true);
    }
  });

  it("Tiny LP tutorial switches views and reaches generate-code and solve steps", () => {
    const steps = tutorialStepsForExample("tiny-lp");

    expect(steps.map((step) => step.id)).toEqual([
      "tiny-lp-load",
      "tiny-lp-construct",
      "tiny-lp-validate",
      "tiny-lp-code",
      "tiny-lp-solve"
    ]);
    expect(steps[2]?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "switchView", view: "diagnostics" })])
    );
    expect(steps[3]?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "switchView", view: "code" })])
    );
    expect(steps[4]?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "switchView", view: "solution" })])
    );
  });

  it("executes serializable tutorial actions through normal reducer actions", () => {
    let state = emptyAtlasState();
    const defineResult = executeTutorialAction(state, {
      type: "dispatch",
      action: {
        type: "modelObject.define",
        objectKind: "variable",
        name: "x",
        shape: "scalar",
        position: { x: 100, y: 120 }
      }
    });
    if (!defineResult.dispatch) throw new Error("Expected define dispatch.");
    state = atlasReducer(state, defineResult.dispatch);

    const modelObjectId = getCanonicalModelObjects(state)[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected canonical model object.");
    const placeResult = executeTutorialAction(state, {
      type: "dispatch",
      action: {
        type: "workspaceReference.create",
        modelObjectId,
        position: { x: 300, y: 120 }
      }
    });
    if (!placeResult.dispatch) throw new Error("Expected reference dispatch.");
    state = atlasReducer(state, placeResult.dispatch);

    const [definition, reference] = state.cards;
    if (!definition || !reference) throw new Error("Expected definition and reference cards.");
    const connectResult = executeTutorialAction(state, {
      type: "dispatch",
      action: {
        type: "connection.create",
        source: { nodeId: definition.id, objectId: modelObjectId, port: "expression" },
        target: { nodeId: reference.id, objectId: modelObjectId, slot: "arg0" }
      }
    });
    if (!connectResult.dispatch) throw new Error("Expected connection dispatch.");
    state = atlasReducer(state, connectResult.dispatch);

    expect(getCanonicalModelObjects(state)).toHaveLength(1);
    expect(state.cards.filter((card) => card.modelObjectId === modelObjectId)).toHaveLength(2);
    expect(state.connections).toHaveLength(1);
  });

  it("executes explicit scripted actions for clear, define, place, connect, and switch tab", () => {
    let state = defineAtlasModelObject(emptyAtlasState(), "variable", "existing", "scalar");
    const clear = executeTutorialAction(state, { type: "clearWorkspace" });
    if (!clear.dispatch) throw new Error("Expected clear dispatch.");
    state = atlasReducer(state, clear.dispatch);
    expect(state.cards).toHaveLength(0);

    const define = executeTutorialAction(state, {
      type: "defineModelObject",
      action: {
        type: "modelObject.define",
        objectKind: "variable",
        name: "x",
        shape: "scalar",
        position: { x: 120, y: 140 }
      }
    });
    if (!define.dispatch) throw new Error("Expected define dispatch.");
    state = atlasReducer(state, define.dispatch);
    const modelObjectId = state.cards[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected model object id.");

    const place = executeTutorialAction(state, {
      type: "placeWorkspaceReference",
      modelObjectId,
      position: { x: 420, y: 140 }
    });
    if (!place.dispatch) throw new Error("Expected place dispatch.");
    state = atlasReducer(state, place.dispatch);

    const connect = executeTutorialAction(state, {
      type: "connectObjects",
      source: { nodeId: state.cards[0]?.id, objectId: modelObjectId, port: "expression" },
      target: { nodeId: state.cards[1]?.id, objectId: modelObjectId, slot: "arg0" }
    });
    if (!connect.dispatch) throw new Error("Expected connect dispatch.");
    state = atlasReducer(state, connect.dispatch);

    const switchView = executeTutorialAction(state, { type: "switchView", view: "code" });
    expect(state.cards).toHaveLength(2);
    expect(state.connections).toHaveLength(1);
    expect(switchView.view).toBe("code");
  });

  it("reports scripted action failures without mutating state", () => {
    const state = emptyAtlasState();
    const result = executeTutorialAction(state, {
      type: "loadExample",
      exampleId: "missing-example" as never
    });

    expect(result.state).toBe(state);
    expect(result.diagnostic).toContain("Unknown Atlas example");
  });
});

describe("Atlas built-in examples UI", () => {
  it("renders load and guided tutorial actions for every built-in example", () => {
    const html = renderToString(
      <AtlasExamplesPanel
        open={true}
        examples={ATLAS_BUILTIN_EXAMPLES}
        onLoad={() => undefined}
        onTutorial={() => undefined}
        onClose={() => undefined}
      />
    );

    expect(html).toContain("Built-in CVXPY examples");
    expect(html).toContain("Tiny linear program");
    expect(html).toContain("Showcase: Least Squares");
    expect(html).toContain("Ridge regression");
    expect(html.match(/Guided tutorial/g)?.length).toBe(3);
  });
});

describe("Atlas compact side tools", () => {
  it("renders right-side collapsible tool sections", () => {
    const html = renderToString(<AtlasApp />);

    expect(html).toContain("Query Builder");
    expect(html).toContain("Properties");
    expect(html).toContain("Metadata / Evaluate");
    expect(html).toContain("CVXPY Code");
    expect(html).toContain("Diagnostics / Solution");
    expect(html).toContain("References");
  });

  it("renders Inspector empty state compactly", () => {
    const html = renderToString(<AtlasInspector {...inspectorProps(null, [])} />);

    expect(html).toContain("No selection");
    expect(html).toContain("Select a card");
  });

  it("renders selected variable summary and collapsible technical sections", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const card = state.cards[0] ?? null;
    const html = renderToString(
      <AtlasInspector
        {...inspectorProps(card, state.cards)}
        cvxpyMetadata={{ shape: [], sign: "UNKNOWN", curvature: "AFFINE", is_dcp: true }}
      />
    );

    expect(html).toContain("Kind");
    expect(html).toContain("Canonical object");
    expect(html).toContain("Reference node");
    expect(html).toContain("Shape");
    expect(html).toContain("DCP");
    expect(html).toContain("CVXPY Code");
    expect(html).toContain("Metadata");
    expect(html).toContain("Diagnostics");
    expect(html).toContain("References / Usages");
    expect(html).toContain("Raw IR");
    expect(html).toContain("Properties");
    expect(html).toContain("Advanced / Debug");
  });

  it("renders selected object code, references, and diagnostics in Inspector sections", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const modelObjectId = withVariable.cards[0]?.modelObjectId ?? "";
    const withReference = createAtlasWorkspaceReference(withVariable, modelObjectId);
    const card = withReference.cards[0] ?? null;
    const html = renderToString(
      <AtlasInspector
        {...inspectorProps(card, withReference.cards)}
        generatedCode={'import cvxpy as cp\nx = cp.Variable(name="x")\nproblem.solve()'}
        selectedRuntimeDiagnostic={{
          cardId: card?.id ?? "",
          diagnosticId: "solve:x",
          label: "solution",
          value: "2",
          status: "ok",
          source: "solve"
        }}
      />
    );

    expect(html).toContain('x = cp.Variable(name=&quot;x&quot;)');
    expect(html).toContain("Workspace references");
    expect(html).toContain("2");
    expect(html).toContain("solution");
  });
});

function inspectorProps(card: AtlasWorkbenchState["cards"][number] | null, cards: AtlasWorkbenchState["cards"]) {
  return {
    card,
    group: null,
    cards,
    queries: [],
    evaluationEntry: null,
    evaluationMode: "current" as const,
    selectedRuntimeDiagnostic: null,
    symbolicPreview: null,
    cvxpyMetadata: null,
    generatedCode: null,
    dependencyHighlightEnabled: true,
    onValidate: () => undefined,
    onEvaluate: () => undefined,
    onGenerateCode: () => undefined,
    onAddTag: () => undefined,
    onUpdateTag: () => undefined,
    onDeleteTag: () => undefined,
    onUpdateCardDetails: () => undefined,
    onAddProperty: () => undefined,
    onUpdateProperty: () => undefined,
    onDeleteProperty: () => undefined,
    onUpdateModule: () => undefined,
    onDeleteModule: () => undefined,
    onUpdateTaggedSum: () => undefined,
    onUpdateAtomInput: () => undefined,
    onUpdateObjective: () => undefined,
    onAddObjectiveTerm: () => undefined,
    onUpdateObjectiveTerm: () => undefined,
    onRemoveObjectiveTerm: () => undefined,
    onMoveObjectiveTerm: () => undefined,
    onFocusObjectiveTerm: () => undefined,
    onUpdateConstraint: () => undefined,
    onToggleDependencyHighlight: () => undefined,
    onUpdateGroup: () => undefined,
    onDeleteGroup: () => undefined,
    onDeleteCard: () => undefined,
    onClear: () => undefined
  };
}

describe("Atlas GUI architecture registries", () => {
  it("registers commands with enabled predicates and delegates execution", () => {
    const calls: string[] = [];
    const registry = createAtlasCommandRegistry((commandId) => calls.push(commandId));
    const undo = registry.get("undo");
    const solve = registry.get("solve");

    expect(ATLAS_COMMANDS.some((command) => command.id === "solve")).toBe(true);
    expect(solve?.label).toBe("Solve");
    expect(undo && isAtlasCommandEnabled(undo, { canUndo: false, canRedo: false, hasSelection: false })).toBe(false);
    expect(registry.enabled("undo", { canUndo: true, canRedo: false, hasSelection: false })).toBe(true);

    registry.execute("solve");
    expect(calls).toEqual(["solve"]);
  });

  it("builds professional menus from command descriptors", () => {
    const menus = buildAtlasMenus();

    expect(menus.map((menu) => menu.label)).toEqual(["File", "Edit", "View", "Run", "Examples", "Tools", "Help"]);
    expect(menus.find((menu) => menu.label === "Run")?.commands.map((command) => command.id)).toContain("solve");
    expect(menus.find((menu) => menu.label === "View")?.commands.map((command) => command.id)).toContain("view:diagnostics");
  });

  it("registers synchronized views and switches through the registry helper", () => {
    expect(ATLAS_VIEW_REGISTRY.map((view) => view.id)).toEqual([
      "object",
      "ir",
      "code",
      "solution",
      "diagnostics"
    ]);
    expect(nextAtlasView("object")).toBe("ir");
  });

  it("registers panels and toggles panel state", () => {
    const defaults = defaultAtlasPanelState();
    const toggled = toggleAtlasPanel(defaults, "inspector");

    expect(ATLAS_PANEL_REGISTRY.map((panel) => panel.id)).toEqual(
      expect.arrayContaining(["constructor", "explorer", "inspector", "solution"])
    );
    expect(panelsForRegion("left").map((panel) => panel.id)).toEqual(["constructor", "explorer"]);
    expect(toggled.inspector).toBe(!defaults.inspector);
  });

  it("registers context menu items by target type", () => {
    expect(contextMenuItemsForTarget("node").map((item) => item.id)).toEqual(
      expect.arrayContaining(["delete-reference", "rename", "open-inspector"])
    );
    expect(contextMenuItemsForTarget("canvas").map((item) => item.id)).toEqual(
      expect.arrayContaining(["create-variable", "create-atom"])
    );
  });

  it("opens and closes dialog state and renders confirm dialog callbacks", () => {
    let confirmed = false;
    const dialog = openAtlasDialog({
      type: "confirm",
      title: "Confirm",
      message: "Proceed?",
      onConfirm: () => {
        confirmed = true;
      }
    });
    const html = renderToString(<DialogHost dialog={dialog} onClose={() => undefined} />);

    if (dialog.type === "confirm") dialog.onConfirm();
    expect(confirmed).toBe(true);
    expect(html).toContain("Proceed?");
    expect(closeAtlasDialog()).toEqual({ type: "none" });
  });

  it("centralizes drag payload parsing and coordinate transforms", () => {
    expect(canvasPointFromClient({ x: 30, y: 50 }, { x: 10, y: 20 }, 2)).toEqual({ x: 10, y: 15 });
    expect(
      parseAtlasDragPayload({
        getData: (type: string) => type === "application/x-atlas-model-object" ? "var-x" : ""
      })
    ).toEqual({ kind: "modelObject", modelObjectId: "var-x" });
  });
});

describe("Atlas canonical model definitions", () => {
  it("defines a canonical variable and lists it as one model object", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const canonical = getCanonicalModelObjects(state);

    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.title).toBe("x");
    expect(canonical[0]?.modelObjectKind).toBe("variable");
    expect(canonical[0]?.workspaceRole).toBe("definition");
  });

  it("defining a variable does not create a workspace node", () => {
    const state = defineAtlasModelObject(emptyAtlasState(), "variable", "y", 20);
    const ir = exportAtlasIR(state);

    expect(getCanonicalModelObjects(state)).toHaveLength(1);
    expect(getWorkspaceCards(state)).toHaveLength(0);
    expect(ir.modelObjects.variables[0]?.name).toBe("y");
    expect(ir.workspaceNodes).toEqual([]);
  });

  it("creates multiple workspace references that share one model object id", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const modelObjectId = getCanonicalModelObjects(withVariable)[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected canonical variable id.");
    const withFirstReference = createAtlasWorkspaceReference(withVariable, modelObjectId, { x: 100, y: 100 });
    const withSecondReference = createAtlasWorkspaceReference(withFirstReference, modelObjectId, { x: 400, y: 100 });

    expect(getCanonicalModelObjects(withSecondReference)).toHaveLength(1);
    expect(withSecondReference.cards.filter((card) => card.modelObjectId === modelObjectId)).toHaveLength(3);
    expect(
      withSecondReference.cards.filter((card) => card.workspaceRole === "reference").map((card) => card.position)
    ).toEqual([{ x: 100, y: 100 }, { x: 400, y: 100 }]);
  });

  it("deleting a workspace reference keeps the canonical definition", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const modelObjectId = getCanonicalModelObjects(withVariable)[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected canonical variable id.");
    const withReference = createAtlasWorkspaceReference(withVariable, modelObjectId);
    const referenceId = withReference.cards.find((card) => card.workspaceRole === "reference")?.id;
    if (!referenceId) throw new Error("Expected reference card.");
    const withoutReference = deleteAtlasCard(withReference, referenceId);

    expect(getCanonicalModelObjects(withoutReference)).toHaveLength(1);
    expect(withoutReference.cards.some((card) => card.modelObjectId === modelObjectId)).toBe(true);
    expect(withoutReference.cards.some((card) => card.id === referenceId)).toBe(false);
  });

  it("deleting a canonical object removes all visual references and related connections", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const modelObjectId = getCanonicalModelObjects(withVariable)[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected canonical variable id.");
    const withReference = createAtlasWorkspaceReference(withVariable, modelObjectId);
    const withConnection = addAtlasConnection(
      withReference,
      { nodeId: withReference.cards[0]?.id, objectId: modelObjectId, port: "expression" },
      { nodeId: withReference.cards[1]?.id, objectId: modelObjectId, slot: "arg0" }
    );
    const deleted = deleteAtlasCanonicalObject(withConnection, modelObjectId);

    expect(deleted.cards.some((card) => card.modelObjectId === modelObjectId)).toBe(false);
    expect(deleted.connections).toHaveLength(0);
  });

  it("selecting and deleting a connection clears only that connection", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const modelObjectId = getCanonicalModelObjects(withVariable)[0]?.modelObjectId;
    if (!modelObjectId) throw new Error("Expected canonical variable id.");
    const withReference = createAtlasWorkspaceReference(withVariable, modelObjectId);
    const reference = getWorkspaceCards(withReference)[0];
    if (!reference) throw new Error("Expected workspace reference.");
    const connected = addAtlasConnection(
      withReference,
      { nodeId: reference.id, objectId: modelObjectId, port: "expression" },
      { nodeId: reference.id, objectId: modelObjectId, slot: "arg0" }
    );
    const connectionId = connected.connections[0]?.id;
    if (!connectionId) throw new Error("Expected connection id.");
    const selected = atlasReducer(connected, { type: "connection.select", connectionId });
    const deleted = atlasReducer(selected, { type: "connection.delete", connectionId });

    expect(selected.selectedConnectionId).toBe(connectionId);
    expect(deleted.connections).toEqual([]);
    expect(deleted.cards).toHaveLength(2);
    expect(deleted.selectedConnectionId).toBeNull();
  });

  it("connecting a variable output to norm input updates atom preview", () => {
    const normSpec = FALLBACK_ATOM_SPECS.find((spec) => spec.name === "norm");
    if (!normSpec) throw new Error("Expected norm atom spec.");
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "y", 3);
    const variableObjectId = getCanonicalModelObjects(withVariable)[0]?.modelObjectId;
    if (!variableObjectId) throw new Error("Expected variable object id.");
    const withAtom = defineAtlasModelObject(withVariable, "atom", "norm", "scalar", normSpec);
    const atomObjectId = getCanonicalModelObjects(withAtom).find((card) => card.modelObjectKind === "atom")?.modelObjectId;
    if (!atomObjectId) throw new Error("Expected atom object id.");
    const withVariableReference = createAtlasWorkspaceReference(withAtom, variableObjectId);
    const withAtomReference = createAtlasWorkspaceReference(withVariableReference, atomObjectId);
    const variableNode = getWorkspaceCards(withAtomReference).find((card) => card.modelObjectKind === "variable");
    const atomNode = getWorkspaceCards(withAtomReference).find((card) => card.modelObjectKind === "atom");
    if (!variableNode || !atomNode) throw new Error("Expected workspace references.");
    const connected = addAtlasConnection(
      withAtomReference,
      { nodeId: variableNode.id, objectId: variableObjectId, port: "expression" },
      { nodeId: atomNode.id, objectId: atomObjectId, slot: "arg0" }
    );
    const updatedAtom = getWorkspaceCards(connected).find((card) => card.id === atomNode.id);
    if (!updatedAtom) throw new Error("Expected updated atom reference.");
    const html = renderToString(
      <AtlasCardView
        card={updatedAtom}
        allCards={connected.cards}
        queries={[]}
        dependencyPropertyNames={new Set()}
        diagnostics={[]}
        selected={false}
        highlighted={false}
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(updatedAtom.atomConfig?.positionalInputs[0]?.objectId).toBe(variableObjectId);
    expect(html).toContain("norm(y");
    expect(html).toContain("y");
  });

  it("can plug an atom output into an objective and persist the connection", () => {
    const normSpec = FALLBACK_ATOM_SPECS.find((spec) => spec.name === "norm");
    if (!normSpec) throw new Error("Expected norm atom spec.");
    let state = defineAtlasModelObject(emptyAtlasState(), "variable", "y", 3);
    state = defineAtlasModelObject(state, "atom", "norm", "scalar", normSpec);
    state = defineAtlasModelObject(state, "objective", "minimize norm");
    const variableObjectId = getCanonicalModelObjects(state).find((card) => card.modelObjectKind === "variable")?.modelObjectId;
    const atomObjectId = getCanonicalModelObjects(state).find((card) => card.modelObjectKind === "atom")?.modelObjectId;
    const objectiveObjectId = getCanonicalModelObjects(state).find((card) => card.modelObjectKind === "objective")?.modelObjectId;
    if (!variableObjectId || !atomObjectId || !objectiveObjectId) throw new Error("Expected model object ids.");
    state = createAtlasWorkspaceReference(state, variableObjectId);
    state = createAtlasWorkspaceReference(state, atomObjectId);
    state = createAtlasWorkspaceReference(state, objectiveObjectId);
    const variableNode = getWorkspaceCards(state).find((card) => card.modelObjectKind === "variable");
    const atomNode = getWorkspaceCards(state).find((card) => card.modelObjectKind === "atom");
    const objectiveNode = getWorkspaceCards(state).find((card) => card.modelObjectKind === "objective");
    if (!variableNode || !atomNode || !objectiveNode) throw new Error("Expected workspace references.");
    state = addAtlasConnection(
      state,
      { nodeId: variableNode.id, objectId: variableObjectId, port: "expression" },
      { nodeId: atomNode.id, objectId: atomObjectId, slot: "arg0" }
    );
    state = addAtlasConnection(
      state,
      { nodeId: atomNode.id, objectId: atomObjectId, port: "expression" },
      { nodeId: objectiveNode.id, objectId: objectiveObjectId, slot: "term0" }
    );
    const objective = getWorkspaceCards(state).find((card) => card.id === objectiveNode.id);
    const imported = importAtlasIR(JSON.parse(serializeAtlasIR(exportAtlasIR(state))));

    expect(objective?.objective?.terms[0]?.functionCardId).toBe(atomObjectId);
    expect(exportAtlasIR(state).connections).toEqual(
      expect.arrayContaining([expect.objectContaining({ target: expect.objectContaining({ slot: "term0" }) })])
    );
    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.connections.some((connection) => connection.target.slot === "term0")).toBe(true);
  });

  it("stores CVXPY variable shape and attributes on canonical definitions", () => {
    const state = defineAtlasModelObject(
      emptyAtlasState(),
      "variable",
      "z",
      10,
      undefined,
      undefined,
      { boolean: true, nonneg: true }
    );
    const variable = exportAtlasIR(state).modelObjects.variables[0];

    expect(variable?.shape).toBe(10);
    expect(variable?.decision?.shape).toBe("vector");
    expect(variable?.decision?.variableType).toBe("binary");
    expect(variable?.decision?.attributes).toMatchObject({ boolean: true, nonneg: true });
  });

  it("parses scalar, vector, matrix, and custom CVXPY shapes", () => {
    expect(parseAtlasShapeDraft({ mode: "scalar" })).toMatchObject({ ok: true, shape: "scalar" });
    expect(parseAtlasShapeDraft({ mode: "vector", vectorLength: "20" })).toMatchObject({ ok: true, shape: 20 });
    expect(parseAtlasShapeDraft({ mode: "matrix", matrixRows: "3", matrixCols: "2" })).toMatchObject({ ok: true, shape: [3, 2] });
    expect(parseAtlasShapeDraft({ mode: "custom", customShape: "(4, 5)" })).toMatchObject({ ok: true, shape: [4, 5] });
    expect(parseAtlasShapeDraft({ mode: "custom", customShape: "(0, 5)" })).toMatchObject({ ok: false });
  });

  it("serializes semantic connections between workspace ports and slots", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const withAtom = defineAtlasModelObject(withVariable, "atom", "sum", "scalar");
    const variableObjectId = withAtom.cards.find((card) => card.modelObjectKind === "variable")?.modelObjectId;
    const atomObjectId = withAtom.cards.find((card) => card.modelObjectKind === "atom")?.modelObjectId;
    if (!variableObjectId || !atomObjectId) throw new Error("Expected variable and atom objects.");
    const withVariableReference = createAtlasWorkspaceReference(withAtom, variableObjectId);
    const withAtomReference = createAtlasWorkspaceReference(withVariableReference, atomObjectId);
    const variableNode = withAtomReference.cards.find((card) => card.workspaceRole === "reference" && card.modelObjectKind === "variable");
    const atomNode = withAtomReference.cards.find((card) => card.workspaceRole === "reference" && card.modelObjectKind === "atom");
    if (!variableNode || !atomNode) throw new Error("Expected variable and atom nodes.");
    const connected = addAtlasConnection(
      withAtomReference,
      { nodeId: variableNode.id, objectId: variableNode.modelObjectId, port: "expression" },
      { nodeId: atomNode.id, objectId: atomNode.modelObjectId, slot: "arg0" }
    );
    const imported = importAtlasIR(JSON.parse(serializeAtlasIR(exportAtlasIR(connected))));

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.connections).toHaveLength(1);
    expect(imported.state.connections[0]?.source.port).toBe("expression");
    expect(imported.state.connections[0]?.target.slot).toBe("arg0");
  });

  it("reports invalid connection diagnostics without crashing", () => {
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const invalid = addAtlasConnection(
      withVariable,
      { nodeId: "missing-node", objectId: "missing-object", port: "expression" },
      { nodeId: withVariable.cards[0]?.id, objectId: withVariable.cards[0]?.modelObjectId, slot: "arg0" }
    );

    expect(getInvalidAtlasConnections(invalid)).toHaveLength(1);
    expect(validateCvxpyFirstIR(exportAtlasIR(invalid))).toContain(
      `Connection "connection_missing-node_expression_${withVariable.cards[0]?.id}_arg0" source references missing workspace node "missing-node".`
    );
  });

  it("renders expression ports and atom input slots", () => {
    const variable = {
      ...createAtlasCard("decision", { id: "node-x" }),
      title: "x",
      modelObjectId: "var-x",
      modelObjectKind: "variable" as const
    };
    const atom = {
      ...createAtlasCard("function", { id: "node-sum" }),
      title: "sum",
      modelObjectId: "atom-sum",
      modelObjectKind: "atom" as const
    };
    const html = renderToString(
      <>
        <AtlasCardView
          card={variable}
          allCards={[variable, atom]}
          queries={[]}
          dependencyPropertyNames={new Set()}
          diagnostics={[]}
          selected
          highlighted={false}
          onPointerDown={() => undefined}
          onPointerMove={() => undefined}
          onPointerUp={() => undefined}
          onPointerCancel={() => undefined}
        />
        <AtlasCardView
          card={atom}
          allCards={[variable, atom]}
          queries={[]}
          dependencyPropertyNames={new Set()}
          diagnostics={[]}
          selected
          highlighted={false}
          onPointerDown={() => undefined}
          onPointerMove={() => undefined}
          onPointerUp={() => undefined}
          onPointerCancel={() => undefined}
        />
      </>
    );

    expect(html).toContain("x");
    expect(html).toContain("sum");
    expect(html).toContain("arg 1");
    expect(html).toContain("arg 2");
  });

  it("stores CVXPY atom metadata when creating an atom object", () => {
    const atomSpec = FALLBACK_ATOM_SPECS.find((atom) => atom.name === "norm");
    if (!atomSpec) throw new Error("Expected norm fallback atom.");
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomCard = state.cards[0];

    expect(atomCard?.atomSpec?.name).toBe("norm");
    expect(atomCard?.atomSpec?.importPath).toBe("cvxpy.norm");
    expect(atomCard?.atomSpec?.signature).toBe("(x, p=2, axis=None)");
    expect(atomCard?.atomConfig?.atomName).toBe("norm");
    expect(atomCard?.atomConfig?.positionalInputs[0]?.name).toBe("x");
    expect(atomCard?.atomConfig?.keywordInputs.p?.value).toBe(2);
    expect(exportAtlasIR(state).modelObjects.atoms[0]?.atomSpec?.name).toBe("norm");
  });

  it("creates a generic AtomObject from a generated symbol id", () => {
    const atomSpec = atomSpecFromSymbolId("cvxpy.atoms.norm.norm");
    if (!atomSpec) throw new Error("Expected generated norm symbol.");
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomCard = state.cards[0];
    const atomObject = exportAtlasIR(state).modelObjects.atoms[0];

    expect(atomCard?.atomSpec?.symbolId).toBe("cvxpy.atoms.norm.norm");
    expect(atomCard?.atomConfig?.symbolId).toBe("cvxpy.atoms.norm.norm");
    expect(atomObject?.symbolId).toBe("cvxpy.atoms.norm.norm");
    expect(atomObject?.atomName).toBe("norm");
    expect(atomObject?.positionalInputs[0]?.name).toBe("x");
  });

  it("serializes generic AtomObject inputs through Atlas IR", () => {
    const atomSpec = FALLBACK_ATOM_SPECS.find((atom) => atom.name === "norm");
    if (!atomSpec) throw new Error("Expected norm fallback atom.");
    const withVariable = defineAtlasModelObject(emptyAtlasState(), "variable", "x", "scalar");
    const withAtom = defineAtlasModelObject(withVariable, "atom", atomSpec.name, "scalar", atomSpec);
    const atomCard = withAtom.cards.find((card) => card.modelObjectKind === "atom");
    const variableCard = withAtom.cards.find((card) => card.modelObjectKind === "variable");
    if (!atomCard || !variableCard || !variableCard.modelObjectId) throw new Error("Expected atom and variable.");
    const configured = updateAtlasAtomInput(
      withAtom,
      atomCard.id,
      "positional",
      atomCard.atomConfig?.positionalInputs[0]?.id ?? "arg_0",
      { kind: "reference", objectId: variableCard.modelObjectId }
    );
    const ir = exportAtlasIR(configured);
    const atomObject = ir.modelObjects.atoms[0];

    expect(atomObject?.atomName).toBe("norm");
    expect(atomObject?.importPath).toBe("cvxpy.norm");
    expect(atomObject?.displayName).toBe("norm");
    expect(atomObject?.positionalInputs[0]?.objectId).toBe(variableCard.modelObjectId);
    expect(atomObject?.keywordInputs.p?.value).toBe(2);
    expect(importAtlasIR(JSON.parse(serializeAtlasIR(ir))).diagnostics).toEqual([]);
  });

  it("updates positional and keyword atom inputs independently", () => {
    const atomSpec = FALLBACK_ATOM_SPECS.find((atom) => atom.name === "norm");
    if (!atomSpec) throw new Error("Expected norm fallback atom.");
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomCard = state.cards[0];
    if (!atomCard?.atomConfig) throw new Error("Expected atom config.");
    const withReference = updateAtlasAtomInput(
      state,
      atomCard.id,
      "positional",
      atomCard.atomConfig.positionalInputs[0]?.id ?? "arg_0",
      { objectId: "var-x" }
    );
    const withKeyword = updateAtlasAtomInput(
      withReference,
      atomCard.id,
      "keyword",
      "p",
      { kind: "literal", value: 1 }
    );
    const updated = withKeyword.cards[0]?.atomConfig;

    expect(updated?.positionalInputs[0]?.objectId).toBe("var-x");
    expect(updated?.keywordInputs.p?.value).toBe(1);
  });

  it("renders a generic AtomNode with mocked norm metadata", () => {
    const atomSpec = FALLBACK_ATOM_SPECS.find((atom) => atom.name === "norm");
    if (!atomSpec) throw new Error("Expected norm fallback atom.");
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomConfig = state.cards[0]?.atomConfig;
    if (!atomConfig) throw new Error("Expected atom config.");
    const html = renderToString(
      <AtlasAtomNode
        atomConfig={atomConfig}
        metadata={{ shape: [], sign: "NONNEGATIVE", curvature: "CONVEX", is_dcp: true }}
      />
    );

    expect(html).toContain("norm");
    expect(html).toContain("(x, p=2, axis=None)");
    expect(html).toContain("x");
    expect(html).toContain("p");
    expect(html).toContain("Output");
    expect(html).toContain("CONVEX");
    expect(html).toContain("DCP");
  });

  it("renders optional atom UI override hints", () => {
    const atomSpec = {
      ...FALLBACK_ATOM_SPECS.find((atom) => atom.name === "norm")!,
      category: "Norms",
      uiOverrides: {
        description: "Use p dropdown values such as 1, 2, inf, fro, and nuc.",
        argumentUiHints: { p: { control: "select", options: [1, 2, "inf", "fro", "nuc"] } }
      }
    };
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomConfig = state.cards[0]?.atomConfig;
    if (!atomConfig) throw new Error("Expected atom config.");
    const html = renderToString(<AtlasAtomNode atomConfig={atomConfig} />);

    expect(html).toContain("Use p dropdown values");
  });

  it("renders variadic catalog hints as add-input affordances", () => {
    const atomSpec = atomSpecFromSymbolId("cvxpy.atoms.affine.hstack.hstack");
    if (!atomSpec) throw new Error("Expected generated hstack symbol.");
    const state = defineAtlasModelObject(emptyAtlasState(), "atom", atomSpec.name, "scalar", atomSpec);
    const atomConfig = state.cards[0]?.atomConfig;
    if (!atomConfig) throw new Error("Expected atom config.");
    const html = renderToString(<AtlasAtomNode atomConfig={atomConfig} />);

    expect(html).toContain("hstack");
    expect(html).toContain("+ add");
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
      emptyAtlasState()
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
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const moved = moveAtlasCard(withCard, "card-test", { x: 20, y: 30 });
    const deleted = deleteAtlasCard(moved, "card-test");

    expect(moved.cards[0]?.position).toEqual({ x: 20, y: 30 });
    expect(deleted.cards).toHaveLength(0);
    expect(deleted.selectedCardId).toBeNull();
  });

  it("updates card title and notes", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "objective", "objective-card");
    const updated = updateAtlasCardDetails(withCard, "objective-card", {
      title: "Profit objective",
      notes: "Primary optimization target"
    });

    expect(updated.cards[0]?.title).toBe("Profit objective");
    expect(updated.cards[0]?.notes).toBe("Primary optimization target");
  });

  it("renders an Atlas card component", () => {
    const card = {
      ...createAtlasCard("function", {
      id: "card-function",
      position: { x: 12, y: 24 }
      }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        {
          id: "prop-cost",
          name: "unit_cost",
          kind: "constant" as const,
          value: 12
        }
      ],
      modules: [
        {
          id: "module-price",
          kind: "property" as const,
          label: "price",
          value: "15",
          position: { x: 20, y: 22 }
        }
      ]
    };
    const html = renderToString(
      <AtlasCardView
        card={card}
        allCards={[card]}
        queries={[]}
        dependencyPropertyNames={new Set()}
        diagnostics={[
          {
            cardId: card.id,
            diagnosticId: "eval",
            label: "value",
            value: "12",
            status: "ok",
            source: "evaluate"
          }
        ]}
        metadata={{
          shape: [],
          sign: "NONNEGATIVE",
          curvature: "CONVEX",
          is_dcp: true
        }}
        selected
        highlighted
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(html).toContain("Function");
    expect(html).toContain("type");
    expect(html).toContain("product");
    expect(html).toContain("unit_cost");
    expect(html).toContain("12");
    expect(html).toContain("shape");
    expect(html).toContain("scalar");
    expect(html).toContain("convex");
    expect(html).toContain("DCP ok");
    expect(html).toContain("price");
    expect(html).toContain("value");
    expect(html).toContain("data-card-id=\"card-function\"");
    expect(html).toContain("selected");
    expect(html).toContain("query-highlighted");
  });

  it("adds, updates, and deletes typed tags", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withTag = addAtlasTag(withCard, "card-test", " type ", " product ", "tag-type");
    const updated = updateAtlasTag(withTag, "card-test", "tag-type", "factory", "A");
    const deleted = deleteAtlasTag(updated, "card-test", "tag-type");

    expect(withTag.cards[0]?.tags).toEqual([{ id: "tag-type", key: "type", value: "product" }]);
    expect(updated.cards[0]?.tags).toEqual([{ id: "tag-type", key: "factory", value: "A" }]);
    expect(deleted.cards[0]?.tags).toEqual([]);
  });

  it("rejects empty tag keys", () => {
    expect(() => createAtlasTag("   ", "product")).toThrow("Tag key is required.");
  });

  it("adds, updates, and deletes card properties", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withProperty = addAtlasProperty(
      withCard,
      "card-test",
      " unit_cost ",
      "constant",
      12,
      { id: "prop-cost", unit: " USD " }
    );
    const updated = updateAtlasProperty(
      withProperty,
      "card-test",
      "prop-cost",
      "production_quantity",
      "decision_ref",
      "decision-card",
      { notes: "initial decision reference" }
    );
    const deleted = deleteAtlasProperty(updated, "card-test", "prop-cost");

    expect(withProperty.cards[0]?.properties).toEqual([
      { id: "prop-cost", name: "unit_cost", kind: "constant", value: 12, unit: "USD" }
    ]);
    expect(updated.cards[0]?.properties).toEqual([
      {
        id: "prop-cost",
        name: "production_quantity",
        kind: "decision_ref",
        value: "decision-card",
        notes: "initial decision reference"
      }
    ]);
    expect(deleted.cards[0]?.properties).toEqual([]);
  });

  it("attaches, updates, moves, and deletes living card modules", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withModule = attachAtlasModule(withCard, "card-test", "property", {
      id: "module-cost",
      label: "cost",
      value: "12",
      position: { x: 20, y: 30 }
    });
    const updated = updateAtlasModule(withModule, "card-test", "module-cost", {
      value: "14",
      unit: "USD",
      position: { x: 40, y: 50 }
    });
    const deleted = deleteAtlasModule(updated, "card-test", "module-cost");

    expect(withModule.cards[0]?.modules?.[0]).toMatchObject({
      kind: "property",
      label: "cost",
      value: "12"
    });
    expect(updated.cards[0]?.modules?.[0]).toMatchObject({
      value: "14",
      unit: "USD",
      position: { x: 40, y: 50 }
    });
    expect(deleted.cards[0]?.modules).toEqual([]);
  });

  it("normalizes persisted modules with cards", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "card-test",
          type: "object",
          modules: [
            {
              id: "module-tag",
              kind: "tag",
              label: "type",
              value: "product",
              position: { x: 10, y: 14 }
            }
          ]
        }
      ]
    });

    expect(normalized.cards[0]?.modules?.[0]).toMatchObject({
      id: "module-tag",
      kind: "tag",
      label: "type",
      value: "product",
      position: { x: 10, y: 14 }
    });
  });

  it("updates and marks runtime diagnostics stale", () => {
    const diagnostics = upsertRuntimeDiagnostics([], [
      {
        cardId: "card-test",
        diagnosticId: "solve:quantity",
        label: "solution",
        value: "4",
        status: "ok",
        source: "solve"
      }
    ]);

    expect(diagnostics).toHaveLength(1);
    expect(markSolveDiagnosticsStale(diagnostics)[0]?.status).toBe("stale");
  });

  it("rejects empty property names", () => {
    expect(() => createAtlasProperty("   ", "constant", 12)).toThrow("Property name is required.");
  });

  it("normalizes persisted properties", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "card-test",
          type: "object",
          title: "Object",
          position: { x: 1, y: 2 },
          tags: [],
          properties: [
            {
              id: "prop-cost",
              name: "unit_cost",
              kind: "constant",
              value: 12,
              unit: " USD ",
              notes: " input "
            },
            {
              id: "prop-invalid",
              name: "",
              kind: "constant",
              value: 0
            }
          ],
          notes: ""
        }
      ],
      groups: [
        {
          id: "group-test",
          title: "Factory A",
          position: { x: 10, y: 20 },
          size: { width: 640, height: 360 },
          notes: "visual only"
        }
      ],
      selectedCardId: "card-test"
    });

    expect(normalized.cards[0]?.properties).toEqual([
      {
        id: "prop-cost",
        name: "unit_cost",
        kind: "constant",
        value: 12,
        unit: "USD",
        notes: "input"
      }
    ]);
    expect(normalized.selectedCardId).toBe("card-test");
    expect(normalized.groups[0]?.title).toBe("Factory A");
  });

  it("creates cards from templates with copied tags and properties", () => {
    const state = addAtlasCardFromTemplate(
      emptyAtlasState(),
      "product-like-object"
    );
    const card = state.cards[0];

    expect(card?.title).toBe("Product-like Object");
    expect(card?.type).toBe("object");
    expect(card?.tags.map((tag) => [tag.key, tag.value])).toEqual([
      ["type", "product"],
      ["status", "active"]
    ]);
    expect(card?.properties.map((property) => [property.name, property.kind])).toEqual([
      ["unit_cost", "constant"],
      ["demand", "constant"],
      ["production_quantity", "decision_ref"],
      ["machine_hours_per_unit", "constant"]
    ]);
    expect(state.selectedCardId).toBe(card?.id);
  });

  it("keeps template-created cards independent from templates and each other", () => {
    const firstState = addAtlasCardFromTemplate(
      emptyAtlasState(),
      "generic-object"
    );
    const secondState = addAtlasCardFromTemplate(firstState, "generic-object");
    const firstCard = secondState.cards[0];
    const secondCard = secondState.cards[1];
    const template = getAtlasCardTemplate("generic-object");

    expect(firstCard?.id).not.toBe(secondCard?.id);
    expect(firstCard?.tags[0]?.id).not.toBe(secondCard?.tags[0]?.id);
    expect(firstCard?.tags).not.toBe(template?.defaultTags);

    const updated = updateAtlasTag(secondState, firstCard?.id ?? "", firstCard?.tags[0]?.id ?? "", "type", "changed");

    expect(updated.cards[0]?.tags[0]?.value).toBe("changed");
    expect(updated.cards[1]?.tags[0]?.value).toBe("object");
    expect(template?.defaultTags[0]?.value).toBe("object");
  });

  it("creates, updates, and deletes visual groups without deleting cards", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withGroup = addAtlasGroup(withCard, "group-test");
    const updated = updateAtlasGroup(withGroup, "group-test", {
      title: "Factory A",
      notes: "visual cluster",
      size: { width: 500, height: 300 }
    });
    const deleted = deleteAtlasGroup(updated, "group-test");

    expect(withGroup.groups).toHaveLength(1);
    expect(withGroup.selectedGroupId).toBe("group-test");
    expect(withGroup.selectedCardId).toBeNull();
    expect(updated.groups[0]).toMatchObject({
      title: "Factory A",
      notes: "visual cluster",
      size: { width: 500, height: 300 }
    });
    expect(deleted.groups).toEqual([]);
    expect(deleted.cards).toHaveLength(1);
    expect(deleted.cards[0]?.id).toBe("card-test");
  });

  it("renders a visual group", () => {
    const group = createAtlasGroup({
      id: "group-factory-a",
      title: "Factory A",
      position: { x: 30, y: 40 },
      size: { width: 500, height: 260 },
      notes: "Product cards can sit visually inside this region."
    });
    const html = renderToString(
      <AtlasGroupView group={group} selected onSelect={() => undefined} />
    );

    expect(html).toContain("Factory A");
    expect(html).toContain("data-group-id=\"group-factory-a\"");
    expect(html).toContain("selected");
  });

  it("evaluates queries with one include tag", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }]
    };
    const data = {
      ...createAtlasCard("data", { id: "data-card" }),
      tags: [{ id: "tag-type-data", key: "type", value: "data" }]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(evaluateAtlasQuery(query, [product, data]).map((card) => card.id)).toEqual([
      "product-card"
    ]);
  });

  it("evaluates queries with multiple include tags using AND semantics", () => {
    const factoryProduct = {
      ...createAtlasCard("object", { id: "factory-product" }),
      tags: [
        { id: "tag-type", key: "type", value: "product" },
        { id: "tag-factory", key: "factory", value: "A" }
      ]
    };
    const otherProduct = {
      ...createAtlasCard("object", { id: "other-product" }),
      tags: [{ id: "tag-type-other", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });

    expect(evaluateAtlasQuery(query, [factoryProduct, otherProduct]).map((card) => card.id)).toEqual([
      "factory-product"
    ]);
  });

  it("evaluates queries with exclude tags", () => {
    const activeProduct = {
      ...createAtlasCard("object", { id: "active-product" }),
      tags: [
        { id: "tag-type", key: "type", value: "product" },
        { id: "tag-status", key: "status", value: "active" }
      ]
    };
    const inactiveProduct = {
      ...createAtlasCard("object", { id: "inactive-product" }),
      tags: [
        { id: "tag-type-inactive", key: "type", value: "product" },
        { id: "tag-status-inactive", key: "status", value: "inactive" }
      ]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }],
      excludeTags: [{ id: "condition-status", key: "status", value: "inactive" }]
    });

    expect(evaluateAtlasQuery(query, [activeProduct, inactiveProduct]).map((card) => card.id)).toEqual([
      "active-product"
    ]);
  });

  it("returns no query matches when tags do not match or are missing", () => {
    const cardWithoutTags = createAtlasCard("object", { id: "untagged-card" });
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(evaluateAtlasQuery(query, [cardWithoutTags])).toEqual([]);
  });

  it("creates query conditions through state helpers", () => {
    const withQuery = addAtlasQuery(emptyAtlasState(), "query-test");
    const withCondition = addAtlasQueryCondition(
      withQuery,
      "query-test",
      "includeTags",
      "type",
      "product"
    );

    expect(withCondition.queries[0]?.includeTags).toMatchObject([
      { key: "type", value: "product" }
    ]);
    expect(withCondition.selectedQueryId).toBe("query-test");
  });

  it("collects available property names from query matches", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-demand-a", name: "demand", kind: "constant" as const, value: 10 }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        {
          id: "prop-production-b",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "quantity"
        }
      ]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(collectPropertyNamesForQuery(query, [productA, productB])).toEqual([
      "demand",
      "production_quantity",
      "unit_cost"
    ]);
  });

  it("detects matching cards missing a selected property", () => {
    const completeProduct = {
      ...createAtlasCard("object", { id: "complete-product" }),
      title: "Complete Product",
      tags: [{ id: "tag-type-complete", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-complete", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const missingProduct = {
      ...createAtlasCard("object", { id: "missing-product" }),
      title: "Missing Product",
      tags: [{ id: "tag-type-missing", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(getMissingPropertyCards(query, [completeProduct, missingProduct], "unit_cost").map((card) => card.id)).toEqual([
      "missing-product"
    ]);
  });

  it("serializes and previews simple expression references", () => {
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "unit_cost"),
      createLiteralExpression(12)
    );

    expect(expression).toEqual({
      kind: "multiply",
      left: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "unit_cost"
      },
      right: {
        kind: "literal",
        value: 12
      }
    });
    expect(JSON.parse(JSON.stringify(expression))).toEqual(expression);
    expect(expressionPreview(expression)).toBe("unit_cost x 12");
  });

  it("builds and validates structured linear expression terms", () => {
    const expression = buildLinearExpressionFromTerms("query-products", [
      createLinearTermDraft({ id: "term-a", coefficient: "2", propertyName: "production_quantity" }),
      createLinearTermDraft({ id: "term-b", coefficient: "5", propertyName: "storage_quantity" })
    ]);

    expect(expression).toEqual({
      kind: "add",
      terms: [
        {
          kind: "multiply",
          left: { kind: "literal", value: 2 },
          right: {
            kind: "property_ref",
            queryId: "query-products",
            propertyName: "production_quantity"
          }
        },
        {
          kind: "multiply",
          left: { kind: "literal", value: 5 },
          right: {
            kind: "property_ref",
            queryId: "query-products",
            propertyName: "storage_quantity"
          }
        }
      ]
    });
  });

  it("warns when property times property is nonlinear", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const card = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-a", name: "a", kind: "decision_ref" as const, value: "decision-a" },
        { id: "prop-b", name: "b", kind: "decision_ref" as const, value: "decision-b" }
      ]
    };
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "a"),
      createPropertyReferenceExpression("query-products", "b")
    );

    expect(validateLinearExpression(expression, [card], query)[0]?.message).toContain(
      "Property x property"
    );
  });

  it("parses CSV data for Data cards", () => {
    const parsed = parseAtlasCsv("product,demand\nA,10\nB,12\n", "Demand.csv");

    expect(parsed.fileName).toBe("Demand.csv");
    expect(parsed.columns).toEqual(["product", "demand"]);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.previewRows[0]).toEqual({ product: "A", demand: "10" });
  });

  it("creates and labels finite index sets for indexed properties", () => {
    const weeks = createRangeIndexSet("Weeks", 1, 12);
    const indexCard = {
      ...createAtlasCard("data", { id: "weeks" }),
      title: "Weeks",
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: weeks
      }
    };
    const property = createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
      indexSetId: "weeks"
    });

    expect(createIndexSet(" Scenarios ", [" base ", " stress "])).toEqual({
      name: "Scenarios",
      elements: ["base", "stress"]
    });
    expect(weeks.elements).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    expect(indexedPropertyLabel(property, [indexCard])).toBe("production_quantity[Weeks]");
  });

  it("renders an expression preview component", () => {
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "unit_cost"),
      createPropertyReferenceExpression("query-products", "production_quantity")
    );
    const html = renderToString(<AtlasExpressionPreview expression={expression} />);

    expect(html).toContain("unit_cost");
    expect(html).toContain("production_quantity");
  });

  it("creates and updates TaggedSum configuration on function cards", () => {
    const state = addAtlasCard(emptyAtlasState(), "function", "function-card");
    const expression = buildTaggedSumExpression({
      queryId: "query-products",
      primaryProperty: "unit_cost",
      secondaryProperty: "production_quantity"
    });
    const updated = updateTaggedSumConfig(state, "function-card", {
      queryId: "query-products",
      expression,
      displayName: "Total cost",
      description: "Sum cost times quantity."
    });

    expect(updated.cards[0]?.functionKind).toBe("tagged_sum");
    expect(updated.cards[0]?.taggedSum).toEqual(
      createTaggedSumConfig({
        queryId: "query-products",
        expression,
        displayName: "Total cost",
        description: "Sum cost times quantity."
      })
    );
    expect(JSON.parse(JSON.stringify(updated.cards[0]?.taggedSum))).toEqual(
      updated.cards[0]?.taggedSum
    );
  });

  it("reports TaggedSum missing-property diagnostics", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      title: "Product A",
      tags: [
        { id: "tag-type-a", key: "type", value: "product" },
        { id: "tag-factory-a", key: "factory", value: "A" }
      ],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        {
          id: "prop-qty-a",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "qty_a"
        }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      title: "Product B",
      tags: [
        { id: "tag-type-b", key: "type", value: "product" },
        { id: "tag-factory-b", key: "factory", value: "A" }
      ],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 15 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products-a",
      name: "Factory A products",
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-total-cost" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        }),
        displayName: "Total cost"
      })
    };
    const cards = [productA, productB, functionCard];

    expect(getTaggedSumMatchingCards(functionCard, [query], cards).map((card) => card.id)).toEqual([
      "product-a",
      "product-b"
    ]);
    expect(getTaggedSumMissingPropertyCards(functionCard, [query], cards).map((card) => card.id)).toEqual([
      "product-b"
    ]);
  });

  it("extracts Function card dependency summaries without mutating cards", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      title: "Product A",
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        {
          id: "prop-qty-a",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "qty_a"
        }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      title: "Product B",
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 15 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      name: "Products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-total" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        displayName: "Total production cost",
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        })
      })
    };
    const cards = [productA, productB, functionCard];
    const before = JSON.stringify(cards);
    const summary = getFunctionDependencySummary(functionCard, [query], cards);

    expect(summary.query?.id).toBe("query-products");
    expect(summary.matchedCards.map((card) => card.id)).toEqual(["product-a", "product-b"]);
    expect(summary.usedProperties).toEqual(["production_quantity", "unit_cost"]);
    expect(summary.missingCards.map((card) => card.id)).toEqual(["product-b"]);
    expect(JSON.stringify(cards)).toBe(before);
  });

  it("marks dependency properties when rendering matched cards", () => {
    const card = {
      ...createAtlasCard("object", { id: "product-a" }),
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-demand", name: "demand", kind: "constant" as const, value: 20 }
      ]
    };
    const html = renderToString(
      <AtlasCardView
        card={card}
        allCards={[card]}
        queries={[]}
        dependencyPropertyNames={new Set(["unit_cost"])}
        diagnostics={[]}
        selected={false}
        highlighted
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(html).toContain("dependency-property");
    expect(html).toContain("unit_cost");
  });

  it("previews TaggedSum cards with query, expression, and match count", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      name: "Products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-sum" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          literalValue: "2"
        }),
        displayName: "Double cost"
      })
    };

    expect(taggedSumPreview(functionCard, [query], [product, functionCard])).toEqual({
      queryName: "Products",
      expressionLabel: "unit_cost x 2",
      matchCount: 1
    });
  });

  it("normalizes persisted TaggedSum function cards", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "function-sum",
          type: "function",
          functionKind: "tagged_sum",
          title: "Total cost",
          position: { x: 1, y: 2 },
          tags: [],
          properties: [],
          taggedSum: {
            queryId: "query-products",
            displayName: "Total cost",
            expression: {
              kind: "multiply",
              left: {
                kind: "property_ref",
                queryId: "query-products",
                propertyName: "unit_cost"
              },
              right: {
                kind: "property_ref",
                queryId: "query-products",
                propertyName: "production_quantity"
              }
            }
          },
          notes: ""
        }
      ],
      queries: [
        {
          id: "query-products",
          name: "Products",
          includeTags: [{ id: "condition-type", key: "type", value: "product" }],
          excludeTags: []
        }
      ],
      selectedCardId: "function-sum"
    });

    expect(normalized.cards[0]?.functionKind).toBe("tagged_sum");
    expect(normalized.cards[0]?.taggedSum?.displayName).toBe("Total cost");
    expect(normalized.cards[0]?.taggedSum?.expression).toEqual({
      kind: "multiply",
      left: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "unit_cost"
      },
      right: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "production_quantity"
      }
    });
    expect(normalized.selectedCardId).toBe("function-sum");
  });

  it("adds, updates, and reorders objective terms", () => {
    const withObjective = addAtlasCard(emptyAtlasState(), "objective", "objective-card");
    const configured = updateObjectiveConfig(withObjective, "objective-card", {
      direction: "maximize"
    });
    const withFirstTerm = addObjectiveTerm(configured, "objective-card", "function-a");
    const withSecondTerm = addObjectiveTerm(withFirstTerm, "objective-card", "function-b");
    const firstTermId = withSecondTerm.cards[0]?.objective?.terms[0]?.id ?? "";
    const secondTermId = withSecondTerm.cards[0]?.objective?.terms[1]?.id ?? "";
    const renamed = updateObjectiveTerm(
      withSecondTerm,
      "objective-card",
      secondTermId,
      "Revenue",
      "function-b"
    );
    const reordered = moveObjectiveTerm(renamed, "objective-card", secondTermId, "up");

    expect(reordered.cards[0]?.objective?.direction).toBe("maximize");
    expect(reordered.cards[0]?.objective?.terms.map((term) => term.id)).toEqual([
      secondTermId,
      firstTermId
    ]);
    expect(reordered.cards[0]?.objective?.terms[0]).toMatchObject({
      name: "Revenue",
      functionCardId: "function-b"
    });
  });

  it("extracts objective dependencies through referenced Function cards", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      title: "Product",
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost"
        }),
        displayName: "Total cost"
      })
    };
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const summary = getObjectiveDependencySummary(
      objective,
      [product, functionCard, objective],
      [query],
      { termId: "term-cost" }
    );

    expect(summary.functionCards.map((card) => card.id)).toEqual(["function-cost"]);
    expect(summary.participatingCards.map((card) => card.id)).toEqual(["product-card"]);
    expect(objectivePreview(objective, [functionCard]).directionLabel).toBe("Minimize");
  });

  it("updates and previews constraint cards", () => {
    const withConstraint = addAtlasCard(emptyAtlasState(), "constraint", "constraint-card");
    const updated = updateConstraintConfig(withConstraint, "constraint-card", {
      name: "Capacity",
      left: createFunctionConstraintExpression("function-hours"),
      operator: "<=",
      right: createConstantConstraintExpression(100)
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-hours" }),
      title: "Total hours"
    };
    const constraint = updated.cards[0];

    expect(constraint?.constraint).toEqual(
      createConstraintConfig({
        name: "Capacity",
        left: createFunctionConstraintExpression("function-hours"),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    );
    expect(constraint ? constraintPreview(constraint, [functionCard, constraint]) : "").toBe(
      "Total hours <= 100"
    );
  });

  it("extracts constraint dependencies through referenced Function cards", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-hours", name: "machine_hours", kind: "constant" as const, value: 4 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-hours" }),
      title: "Total hours",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "machine_hours"
        }),
        displayName: "Total hours"
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        name: "Capacity",
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const summary = getConstraintDependencySummary(
      constraint,
      [product, functionCard, constraint],
      [query]
    );

    expect(summary.functionCards.map((card) => card.id)).toEqual(["function-hours"]);
    expect(summary.participatingCards.map((card) => card.id)).toEqual(["product-card"]);
  });

  it("evaluates TaggedSum functions from current property values", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-qty-a", name: "production_quantity", kind: "decision_ref" as const, value: 2 }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 8 },
        { id: "prop-qty-b", name: "production_quantity", kind: "decision_ref" as const, value: 3 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        }),
        displayName: "Total cost"
      })
    };
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [productA, productB, functionCard],
      queries: [query]
    });

    expect(report.entries["function-cost"]?.value).toEqual({ kind: "number", value: 48 });
    expect(report.entries["function-cost"]?.diagnostics).toEqual([]);
  });

  it("reports missing properties and invalid expressions during evaluation", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost"
        }),
        displayName: "Total cost"
      })
    };
    const invalid = evaluateExpression(
      { kind: "unknown" } as Parameters<typeof evaluateExpression>[0],
      product
    );
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [product, functionCard],
      queries: [query]
    });

    expect(report.entries["function-cost"]?.value).toBeNull();
    expect(report.entries["function-cost"]?.diagnostics[0]?.message).toContain("missing property");
    expect(invalid.diagnostics[0]?.message).toContain("not supported");
  });

  it("evaluates objectives and constraint sides", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 5 },
        { id: "prop-qty", name: "production_quantity", kind: "decision_ref" as const, value: 4 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        }),
        displayName: "Total cost"
      })
    };
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        name: "Budget",
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(25)
      })
    };
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [product, functionCard, objective, constraint],
      queries: [query]
    });

    expect(report.entries["objective-card"]?.value).toEqual({ kind: "number", value: 20 });
    expect(report.entries["constraint-card"]?.value).toEqual({
      kind: "constraint",
      left: 20,
      right: 25,
      satisfied: true
    });
  });

  it("renders symbolic TaggedSum, objective, and constraint mathematics", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        }),
        displayName: "Total cost"
      })
    };
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const state = {
      ...emptyAtlasState(),
      cards: [functionCard, objective, constraint],
      queries: [query]
    };

    expect(renderExpressionSymbol(functionCard.taggedSum?.expression ?? createLiteralExpression(0))).toBe(
      "unit_cost × production_quantity"
    );
    expect(renderCardSymbolicPreview(functionCard, state)?.expression).toBe(
      "Σ(unit_cost × production_quantity | type=product, factory=A)"
    );
    expect(renderCardSymbolicPreview(objective, state)?.expression).toContain("min Σ(");
    expect(renderCardSymbolicPreview(constraint, state)?.expression).toContain("<= 100");
  });

  it("renders indexed properties in symbolic previews", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const weeks = {
      ...createAtlasCard("data", { id: "weeks" }),
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: createRangeIndexSet("Weeks", 1, 12)
      }
    };
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
          id: "prop-quantity",
          indexSetId: "weeks"
        })
      ]
    };
    const functionCard = {
      ...createAtlasCard("function", { id: "function-production" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: createPropertyReferenceExpression(query.id, "production_quantity")
      })
    };

    expect(
      renderCardSymbolicPreview(functionCard, {
        ...emptyAtlasState(),
        cards: [weeks, product, functionCard],
        queries: [query]
      })?.expression
    ).toContain("production_quantity[Weeks]");
  });

  it("serializes Atlas IR with schema version", () => {
    const state = addAtlasCard(emptyAtlasState(), "object", "product-card");
    const ir = exportAtlasIR(state, { exportedAt: "2026-01-01T00:00:00.000Z" });

    expect(ir.schemaVersion).toBe("0.3.0");
    expect(ir.metadata.schemaVersion).toBe("0.3.0");
    expect(ir.metadata.source).toBe("atlas-gui");
    expect(ir.modelObjects.constants[0]?.id).toBe("product-card");
    expect(ir.workspaceNodes[0]?.modelObjectId).toBe("product-card");
    expect(ir.workspace?.nodes[0]?.modelObjectId).toBe("product-card");
    expect(serializeAtlasIR(ir)).toContain('"modelObjects"');
  });

  it("allows two workspace nodes to reference one canonical variable", () => {
    const state = addAtlasCard(emptyAtlasState(), "decision", "decision-x");
    const ir = exportAtlasIR(state, { exportedAt: "2026-01-01T00:00:00.000Z" });
    const withReference = addWorkspaceReferenceToIR(ir, {
      modelObjectId: "decision-x",
      modelObjectKind: "variable",
      position: { x: 320, y: 120 },
      displayState: { title: "x reference", collapsed: true }
    });

    expect(withReference.modelObjects.variables).toHaveLength(1);
    expect(
      withReference.workspaceNodes.filter((node) => node.modelObjectId === "decision-x")
    ).toHaveLength(2);
    expect(validateCvxpyFirstIR(withReference)).toEqual([]);
  });

  it("deletes a workspace reference without deleting the canonical variable", () => {
    const state = addAtlasCard(emptyAtlasState(), "decision", "decision-x");
    const ir = addWorkspaceReferenceToIR(exportAtlasIR(state), {
      id: "node-x-secondary",
      modelObjectId: "decision-x",
      modelObjectKind: "variable",
      position: { x: 500, y: 100 },
      displayState: { title: "x secondary" }
    });
    const updated = deleteWorkspaceNodeFromIR(ir, "node-x-secondary");

    expect(updated.modelObjects.variables.map((variable) => variable.id)).toEqual(["decision-x"]);
    expect(updated.workspaceNodes.map((node) => node.id)).toEqual(["decision-x"]);
  });

  it("validates missing workspace model object references", () => {
    const ir = exportAtlasIR(emptyAtlasState());

    expect(
      validateCvxpyFirstIR({
        ...ir,
        workspaceNodes: [
          {
            id: "node-missing",
            modelObjectId: "missing-variable",
            modelObjectKind: "variable",
            position: { x: 0, y: 0 },
            displayState: {}
          }
        ]
      })
    ).toEqual([
      'Workspace node "node-missing" references missing model object "missing-variable".'
    ]);
  });

  it("imports pure workspace-node IR without duplicating canonical variables", () => {
    const imported = importAtlasIR({
      schemaVersion: "0.2-cvxpy",
      metadata: {
        schemaVersion: "0.2-cvxpy",
        source: "atlas-gui",
        title: "Pure IR",
        exportedAt: "2026-01-01T00:00:00.000Z"
      },
      modelObjects: {
        variables: [{ id: "var-x", kind: "variable", name: "x" }],
        parameters: [],
        constants: [],
        atoms: [],
        expressions: [],
        constraints: [],
        objectives: [],
        problems: [],
        solvers: [],
        results: [],
        workspaceReferences: []
      },
      workspaceNodes: [
        {
          id: "node-x-a",
          modelObjectId: "var-x",
          modelObjectKind: "variable",
          position: { x: 10, y: 10 },
          displayState: { title: "x", workspaceRole: "definition" }
        },
        {
          id: "node-x-b",
          modelObjectId: "var-x",
          modelObjectKind: "variable",
          position: { x: 300, y: 10 },
          displayState: { title: "x", workspaceRole: "reference" }
        }
      ],
      connections: []
    });

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.cards).toHaveLength(3);
    expect(getCanonicalModelObjects(imported.state)).toHaveLength(1);
    expect(getWorkspaceCards(imported.state)).toHaveLength(2);
    expect(imported.state.cards.map((card) => card.modelObjectId)).toEqual(["var-x", "var-x", "var-x"]);
  });

  it("roundtrips Atlas IR cards, queries, groups, objectives, constraints, and layout", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card", position: { x: 10, y: 20 } }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: "function-cost" }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        left: createFunctionConstraintExpression("function-cost"),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const state = {
      ...emptyAtlasState(),
      cards: [product, objective, constraint],
      queries: [query],
      groups: [
        {
          id: "group-a",
          title: "Factory A",
          position: { x: 0, y: 0 },
          size: { width: 400, height: 240 },
          notes: "layout"
        }
      ]
    };
    const imported = importAtlasIR(JSON.parse(serializeAtlasIR(exportAtlasIR(state))));

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.cards.map((card) => card.id)).toEqual([
      "product-card",
      "objective-card",
      "constraint-card"
    ]);
    expect(imported.state.cards[0]?.position).toEqual({ x: 10, y: 20 });
    expect(imported.state.queries[0]?.id).toBe("query-products");
    expect(imported.state.groups[0]?.title).toBe("Factory A");
  });

  it("roundtrips indexed property metadata through Atlas IR", () => {
    const weeks = {
      ...createAtlasCard("data", { id: "weeks" }),
      title: "Weeks",
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: createRangeIndexSet("Weeks", 1, 12)
      }
    };
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      properties: [
        createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
          id: "prop-quantity",
          indexSetId: "weeks"
        })
      ]
    };
    const imported = importAtlasIR(
      JSON.parse(serializeAtlasIR(exportAtlasIR({ ...emptyAtlasState(), cards: [weeks, product] })))
    );

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.cards[0]?.data?.indexSet?.elements).toHaveLength(12);
    expect(imported.state.cards[1]?.properties[0]?.indexSetId).toBe("weeks");
  });

  it("validates required Atlas IR fields", () => {
    expect(validateAtlasIR({ schemaVersion: "0.1", cards: [{ type: "object" }], queries: [], groups: [] })).toEqual([
      "Card at index 0 is missing required id."
    ]);
  });

  it("roundtrips Atlas project JSON through the IR importer", () => {
    const state = createProductionPlanningExample();
    const parsed = importAtlasProject(JSON.parse(serializeAtlasProject(createAtlasProjectFile(state))));

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.state.cards).toHaveLength(state.cards.length);
    expect(parsed.state.queries[0]?.id).toBe("query-products-factory-a");
  });

  it("provides a production planning example with objective, constraint, and decision refs", () => {
    const example = createProductionPlanningExample();
    const ir = exportAtlasIR(example, { exportedAt: "2026-01-01T00:00:00.000Z" });

    expect(validateAtlasIR(ir)).toEqual([]);
    expect(example.cards.filter((card) => card.type === "object")).toHaveLength(3);
    expect(example.cards.some((card) => card.type === "objective")).toBe(true);
    expect(example.cards.some((card) => card.type === "constraint")).toBe(true);
    expect(
      example.cards
        .filter((card) => card.type === "object")
        .every((card) =>
          card.properties.some(
            (property) => property.name === "production_quantity" && property.kind === "decision_ref"
          )
        )
    ).toBe(true);
  });

  it("parses solve results and maps variables back to cards/properties", () => {
    const example = createProductionPlanningExample();
    const parsed = parseAtlasSolveResult({
      status: "optimal",
      objectiveValue: 120,
      variableValues: { "decision-alpha": 5, "product-alpha.production_quantity": 5 },
      constraints: {
        "constraint-capacity": {
          left: 40,
          right: 40,
          residual: 0,
          satisfied: true
        }
      },
      diagnostics: [],
      code: "import cvxpy as cp"
    });

    expect(parsed.status).toBe("optimal");
    expect(parsed.constraints?.["constraint-capacity"]?.satisfied).toBe(true);
    expect(resolveSolutionVariableTarget("decision-alpha", example.cards)).toEqual({
      cardId: "decision-alpha"
    });
    expect(resolveSolutionVariableTarget("product-alpha.production_quantity", example.cards)).toEqual({
      cardId: "product-alpha",
      propertyName: "production_quantity"
    });
  });

  it("renders solution panel empty, loading, success, error, and stale states", () => {
    const baseProps = {
      statusMessage: "Ready",
      updatedAt: "10:00",
      backendStatus: "connected" as const,
      backendDiagnostics: []
    };
    const success: AtlasSolutionState = {
      status: "success",
      stale: false,
      result: {
        status: "optimal",
        objectiveValue: 120,
        variableValues: { "decision-alpha": 5 },
        constraints: {
          "constraint-capacity": { left: 40, right: 40, residual: 0, satisfied: true }
        },
        diagnostics: [],
        code: "import cvxpy as cp"
      }
    };

    expect(renderToString(<AtlasSolutionPanel {...baseProps} solution={{ status: "empty" }} />)).toContain(
      "No solve results yet."
    );
    expect(
      renderToString(<AtlasSolutionPanel {...baseProps} solution={{ status: "loading" }} />)
    ).toContain("Solving...");
    expect(renderToString(<AtlasSolutionPanel {...baseProps} solution={success} />)).toContain(
      "Objective value"
    );
    expect(
      renderToString(
        <AtlasSolutionPanel
          {...baseProps}
          solution={{ status: "error", message: "Backend down" }}
        />
      )
    ).toContain("Backend down");
    expect(
      renderToString(
        <AtlasSolutionPanel {...baseProps} solution={{ ...success, stale: true }} />
      )
    ).toContain("Solution is stale");
  });

  it("calls backend API client helpers with centralized base URLs", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        json: async () => ({
          status: "ok",
          diagnostics: [],
          metadata: {
            "node-x": {
              shape: [],
              sign: "UNKNOWN",
              curvature: "AFFINE",
              is_dcp: true
            }
          }
        })
      } as Response;
    }) as typeof fetch;

    const ir = exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" });
    await checkAtlasBackendHealth("http://backend.test");
    const validation = await validateAtlasModel(ir, "http://backend.test");
    await evaluateAtlasModel(ir, "http://backend.test");
    await generateAtlasCode(ir, "http://backend.test");
    await solveAtlasModel(ir, "http://backend.test");
    await fetchCvxpyAtoms("http://backend.test");

    globalThis.fetch = originalFetch;
    expect(validation.metadata?.["node-x"]?.curvature).toBe("AFFINE");
    expect(calls).toEqual([
      "http://backend.test/health",
      "http://backend.test/validate",
      "http://backend.test/evaluate",
      "http://backend.test/generate_code",
      "http://backend.test/solve",
      "http://backend.test/cvxpy/atoms"
    ]);
  });

  it("parses mocked backend solve success with generated code and variable values", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({
        status: "optimal",
        objectiveValue: 10,
        variableValues: { "var-x": 2, "var-y": 2 },
        variables: [
          { id: "var-x", name: "x", value: 2 },
          { id: "var-y", name: "y", value: 2 }
        ],
        constraints: {
          "constraint-sum": { left: 4, right: 4, residual: 0, satisfied: true }
        },
        generatedCode: "problem.solve()",
        diagnostics: [],
        solverName: "CLARABEL"
      })
    }) as Response) as typeof fetch;

    const response = await solveAtlasModel(
      exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" }),
      "http://backend.test"
    );
    const result = parseAtlasSolveResult(response);

    globalThis.fetch = originalFetch;
    expect(result.status).toBe("optimal");
    expect(result.objectiveValue).toBe(10);
    expect(result.variableValues["var-x"]).toBe(2);
    expect(result.code).toBe("problem.solve()");
  });

  it("surfaces mocked backend solve failures as readable errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      json: async () => ({})
    }) as Response) as typeof fetch;

    await expect(
      solveAtlasModel(
        exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" }),
        "http://backend.test"
      )
    ).rejects.toThrow("Atlas backend /solve failed with HTTP 500.");

    globalThis.fetch = originalFetch;
  });
});

describe("Atlas search and commands", () => {
  it("searches cards by title, type, tags, and property names", () => {
    const state = createProductionPlanningExample();

    expect(searchAtlasCards(state.cards, "product").map((result) => result.card.id)).toEqual(
      expect.arrayContaining(["product-alpha", "product-beta", "product-gamma"])
    );
    expect(searchAtlasCards(state.cards, "factory=A").map((result) => result.card.id)).toEqual([
      "product-alpha",
      "product-beta",
      "product-gamma"
    ]);
    expect(searchAtlasCards(state.cards, "machine_hours_per_unit")).toHaveLength(3);
    expect(searchAtlasCards(state.cards, "objective").some((result) => result.card.id === "objective-profit")).toBe(true);
  });

  it("registers and filters command palette actions", () => {
    const commands = createAtlasCommands([getAtlasCardTemplate("product-like-object")!]);

    expect(commands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        "create:object",
        "create:decision",
        "create:data",
        "create:function",
        "create:constraint",
        "create:objective",
        "loadExample",
        "saveProject",
        "export",
        "evaluate",
        "solve"
      ])
    );
    expect(filterAtlasCommands(commands, "solve").map((command) => command.id)).toContain("solve");
    expect(filterAtlasCommands(commands, "cvxpy").map((command) => command.id)).toContain("loadExample");
    expect(commands.map((command) => command.id)).not.toContain("template:product-like-object");
  });
});
