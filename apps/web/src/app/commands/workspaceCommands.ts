import { createActionTransaction } from "../transactions/applyTransaction";
import type { AtlasCommandDescriptor } from "./commandTypes";

export const workspaceCommands: AtlasCommandDescriptor[] = [
  {
    id: "workspace.placeReference",
    label: "Place Reference",
    menu: "Workspace",
    enabled: (_context, payload) => typeof payload?.modelObjectId === "string",
    execute: (context, payload) => ({
      transaction: createActionTransaction("Place workspace reference", context.state, {
        type: "workspaceReference.create",
        modelObjectId: String(payload?.modelObjectId),
        position: payload?.position as never
      }, [String(payload?.modelObjectId)]),
      staleModelDerivedState: true
    })
  },
  {
    id: "workspace.deleteReference",
    label: "Delete Reference",
    menu: "Workspace",
    enabled: (_context, payload) => typeof payload?.cardId === "string",
    execute: (context, payload) => ({
      transaction: createActionTransaction("Delete workspace reference", context.state, {
        type: "card.delete",
        cardId: String(payload?.cardId)
      }, [String(payload?.cardId)]),
      staleModelDerivedState: true
    })
  },
  {
    id: "workspace.connectPorts",
    label: "Connect Ports",
    menu: "Workspace",
    enabled: (_context, payload) => Boolean(payload?.source && payload?.target),
    execute: (context, payload) => ({
      transaction: createActionTransaction("Connect ports", context.state, {
        type: "connection.create",
        source: payload?.source as never,
        target: payload?.target as never,
        semanticKind: typeof payload?.semanticKind === "string" ? payload.semanticKind : undefined
      }),
      staleModelDerivedState: true
    })
  },
  {
    id: "workspace.deleteConnection",
    label: "Delete Connection",
    menu: "Workspace",
    enabled: (_context, payload) => typeof payload?.connectionId === "string",
    execute: (context, payload) => ({
      transaction: createActionTransaction("Delete connection", context.state, {
        type: "connection.delete",
        connectionId: String(payload?.connectionId)
      }, [String(payload?.connectionId)]),
      staleModelDerivedState: true
    })
  }
];
