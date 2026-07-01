import { createActionTransaction } from "../transactions/applyTransaction";
import type { AtlasCommandDescriptor } from "./commandTypes";

export const modelCommands: AtlasCommandDescriptor[] = [
  {
    id: "model.defineVariable",
    label: "Define Variable",
    menu: "Model",
    enabled: () => true,
    execute: (context, payload) => ({
      transaction: createActionTransaction("Define variable", context.state, {
        type: "modelObject.define",
        objectKind: "variable",
        name: String(payload?.name ?? "x"),
        shape: payload?.shape ?? "scalar"
      }),
      staleModelDerivedState: true
    })
  },
  {
    id: "model.defineParameter",
    label: "Define Parameter",
    menu: "Model",
    enabled: () => true,
    execute: (context, payload) => ({
      transaction: createActionTransaction("Define parameter", context.state, {
        type: "modelObject.define",
        objectKind: "parameter",
        name: String(payload?.name ?? "p"),
        shape: payload?.shape ?? "scalar",
        value: payload?.value
      }),
      staleModelDerivedState: true
    })
  },
  {
    id: "model.defineConstant",
    label: "Define Constant",
    menu: "Model",
    enabled: () => true,
    execute: (context, payload) => ({
      transaction: createActionTransaction("Define constant", context.state, {
        type: "modelObject.define",
        objectKind: "constant",
        name: String(payload?.name ?? "c"),
        value: payload?.value
      }),
      staleModelDerivedState: true
    })
  },
  {
    id: "model.defineAtom",
    label: "Define Atom",
    menu: "Model",
    enabled: () => true,
    execute: (context, payload) => ({
      transaction: createActionTransaction("Define atom", context.state, {
        type: "modelObject.define",
        objectKind: "atom",
        name: String(payload?.name ?? "atom"),
        atomSpec: payload?.atomSpec as never
      }),
      staleModelDerivedState: true
    })
  },
  {
    id: "model.deleteCanonicalObject",
    label: "Delete Canonical Object",
    menu: "Model",
    enabled: (_context, payload) => typeof payload?.modelObjectId === "string",
    execute: (context, payload) => ({
      transaction: createActionTransaction("Delete canonical object", context.state, {
        type: "modelObject.delete",
        modelObjectId: String(payload?.modelObjectId)
      }, [String(payload?.modelObjectId)]),
      staleModelDerivedState: true
    })
  }
];
