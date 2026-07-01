import { loadAtlasBuiltinExample, type AtlasBuiltinExampleId } from "./builtinExamples";
import type { AtlasAction, AtlasConnectionEndpoint, AtlasPosition, AtlasWorkbenchState } from "./types";

export type AtlasTutorialView = "object" | "ir" | "code" | "solution" | "diagnostics";

export type AtlasTutorialAction =
  | { type: "dispatch"; action: AtlasAction }
  | { type: "clearWorkspace" }
  | { type: "defineModelObject"; action: Extract<AtlasAction, { type: "modelObject.define" }> }
  | { type: "placeWorkspaceReference"; modelObjectId: string; position?: AtlasPosition }
  | { type: "connectObjects"; source: AtlasConnectionEndpoint; target: AtlasConnectionEndpoint; semanticKind?: string }
  | { type: "loadExample"; exampleId: AtlasBuiltinExampleId }
  | { type: "switchView"; view: AtlasTutorialView }
  | { type: "validate" | "evaluate" | "solve" | "generateCode" }
  | { type: "highlight"; cardId: string }
  | { type: "message"; text: string };

export type AtlasTutorialStep = {
  id: string;
  title: string;
  text: string;
  highlightCardId?: string;
  actions: AtlasTutorialAction[];
};

export type AtlasTutorialSession = {
  open: boolean;
  stepIndex: number;
  appliedStepIds: string[];
};

export const ATLAS_TUTORIAL_STEPS: AtlasTutorialStep[] = [
  {
    id: "intro",
    title: "Create a variable",
    text: "Start with a canonical scalar variable tutorial_x. Atlas separates the mathematical object from its visual node.",
    actions: [
      {
        type: "dispatch",
        action: {
          type: "modelObject.define",
          objectKind: "variable",
          name: "tutorial_x",
          shape: "scalar",
          position: { x: 820, y: 780 }
        }
      }
    ]
  },
  {
    id: "atom",
    title: "Add a generic atom",
    text: "Add a generic expression atom. In normal use this comes from the backend CVXPY registry.",
    actions: [
      {
        type: "dispatch",
        action: {
          type: "modelObject.define",
          objectKind: "atom",
          name: "tutorial_abs",
          shape: "scalar",
          atomSpec: {
            name: "abs",
            importPath: "cvxpy.abs",
            signature: "(x)",
            argumentNames: ["x"],
            defaultValues: {},
            doc: "Absolute value atom.",
            category: "Elementwise",
            module: "cvxpy",
            callable: true
          },
          position: { x: 1120, y: 780 }
        }
      }
    ]
  },
  {
    id: "validate",
    title: "Validate with backend metadata",
    text: "Use Validate to ask the backend/CVXPY for shape, curvature, sign, and DCP metadata.",
    actions: [{ type: "message", text: "Click Validate to inspect CVXPY metadata for the current graph." }]
  }
];

export const ATLAS_EXAMPLE_TUTORIALS: Record<AtlasBuiltinExampleId, AtlasTutorialStep[]> = {
  "tiny-lp": exampleSteps("tiny-lp", "Tiny LP", [
    "Define nonnegative variables x and y.",
    "Create linear expressions for 3x + 2y and the capacity constraints.",
    "Connect the objective and constraints into a CVXPY Problem.",
    "Validate, generate code, and solve. Expected solution: x = 2, y = 2, objective = 10."
  ]),
  "least-squares": exampleSteps("least-squares", "Least squares", [
    "Define A, b, and vector variable x.",
    "Build A @ x - b using generic structural expression atoms.",
    "Wrap the residual in sum_squares.",
    "Solve for x approximately [1.1667, 0.5]."
  ]),
  "ridge-regression": exampleSteps("ridge-regression", "Ridge regression", [
    "Reuse A, b, and vector variable x.",
    "Build squared residual loss.",
    "Add lambda times sum_squares(x) as a ridge penalty.",
    "Solve for x approximately [0.8, 0.6]."
  ])
};

export function createTutorialSession(): AtlasTutorialSession {
  return { open: true, stepIndex: 0, appliedStepIds: [] };
}

export function tutorialStepsForExample(exampleId: AtlasBuiltinExampleId): AtlasTutorialStep[] {
  return ATLAS_EXAMPLE_TUTORIALS[exampleId];
}

export function nextTutorialSession(session: AtlasTutorialSession, steps = ATLAS_TUTORIAL_STEPS): AtlasTutorialSession {
  return {
    ...session,
    stepIndex: Math.min(session.stepIndex + 1, steps.length - 1)
  };
}

export function previousTutorialSession(session: AtlasTutorialSession): AtlasTutorialSession {
  return {
    ...session,
    stepIndex: Math.max(session.stepIndex - 1, 0)
  };
}

export function resetTutorialSession(): AtlasTutorialSession {
  return createTutorialSession();
}

export function pendingTutorialActions(
  session: AtlasTutorialSession,
  steps = ATLAS_TUTORIAL_STEPS
): AtlasTutorialAction[] {
  const step = steps[session.stepIndex];
  if (!step || session.appliedStepIds.includes(step.id)) return [];
  return step.actions;
}

export function markTutorialStepApplied(session: AtlasTutorialSession, stepId: string): AtlasTutorialSession {
  return session.appliedStepIds.includes(stepId)
    ? session
    : { ...session, appliedStepIds: [...session.appliedStepIds, stepId] };
}

export function tutorialResetState(state: AtlasWorkbenchState): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.filter((card) => !card.title.startsWith("tutorial_")),
    connections: state.connections.filter(
      (connection) =>
        !(connection.source.objectId ?? "").includes("tutorial") &&
        !(connection.target.objectId ?? "").includes("tutorial")
    ),
    selectedCardId: null
  };
}

export function executeTutorialAction(
  state: AtlasWorkbenchState,
  action: AtlasTutorialAction
): { state: AtlasWorkbenchState; dispatch?: AtlasAction; diagnostic?: string; view?: AtlasTutorialView } {
  if (action.type === "loadExample") {
    try {
      return { state: loadAtlasBuiltinExample(action.exampleId) };
    } catch (error) {
      return { state, diagnostic: error instanceof Error ? error.message : "Example load failed." };
    }
  }
  if (action.type === "clearWorkspace") return { state, dispatch: { type: "workbench.clear" } };
  if (action.type === "defineModelObject") return { state, dispatch: action.action };
  if (action.type === "placeWorkspaceReference") {
    return {
      state,
      dispatch: { type: "workspaceReference.create", modelObjectId: action.modelObjectId, position: action.position }
    };
  }
  if (action.type === "connectObjects") {
    return {
      state,
      dispatch: {
        type: "connection.create",
        source: action.source,
        target: action.target,
        semanticKind: action.semanticKind
      }
    };
  }
  if (action.type === "switchView") return { state, view: action.view };
  if (action.type === "dispatch") return { state, dispatch: action.action };
  if (action.type === "highlight") return { state, dispatch: { type: "card.select", cardId: action.cardId } };
  if (action.type === "message" || action.type === "validate" || action.type === "evaluate" || action.type === "solve" || action.type === "generateCode") {
    return { state };
  }
  return { state, diagnostic: "Unsupported tutorial action." };
}

function exampleSteps(exampleId: AtlasBuiltinExampleId, title: string, texts: string[]): AtlasTutorialStep[] {
  return [
    {
      id: `${exampleId}-load`,
      title: `${title}: load project`,
      text: texts[0] ?? "Load the example project.",
      actions: [{ type: "switchView", view: "object" }, { type: "loadExample", exampleId }]
    },
    {
      id: `${exampleId}-construct`,
      title: `${title}: inspect construction`,
      text: texts[1] ?? "Inspect the generated expression graph.",
      actions: [
        { type: "switchView", view: "object" },
        { type: "message", text: "The example is ordinary Atlas IR and can be edited like any other project." }
      ]
    },
    {
      id: `${exampleId}-validate`,
      title: `${title}: validate`,
      text: texts[2] ?? "Validate the graph with backend metadata.",
      actions: [{ type: "switchView", view: "diagnostics" }, { type: "validate" }]
    },
    {
      id: `${exampleId}-code`,
      title: `${title}: generate code`,
      text: "Generate readable Python/CVXPY code from the same Atlas IR.",
      actions: [{ type: "switchView", view: "code" }, { type: "generateCode" }]
    },
    {
      id: `${exampleId}-solve`,
      title: `${title}: solve`,
      text: texts[3] ?? "Solve the model and inspect the solution.",
      actions: [{ type: "switchView", view: "solution" }, { type: "solve" }]
    }
  ];
}
