import type { SessionState } from "./session";

export type SessionExportSchemaVersion = 1;

export type SessionExportJson = {
  schemaVersion: SessionExportSchemaVersion;
  exportedAt: string;
  app: "data-science-deck-app";
  session: SessionState;
};
