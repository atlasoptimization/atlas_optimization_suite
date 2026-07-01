export type AtlasEventLogEntry = {
  id: string;
  timestamp: string;
  type: "command" | "transaction" | "backend" | "diagnostic" | "error";
  message: string;
  commandId?: string;
  payload?: unknown;
  transactionId?: string;
  summary?: string;
};

export type AtlasEventLog = {
  entries: AtlasEventLogEntry[];
  record: (entry: Omit<AtlasEventLogEntry, "id" | "timestamp">) => AtlasEventLogEntry;
  clear: () => void;
};

export function createEventLog(limit = 500): AtlasEventLog {
  const entries: AtlasEventLogEntry[] = [];
  return {
    entries,
    record(entry) {
      const next = {
        id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toISOString(),
        ...entry
      };
      entries.push(next);
      if (entries.length > limit) entries.splice(0, entries.length - limit);
      return next;
    },
    clear() {
      entries.splice(0, entries.length);
    }
  };
}

export const atlasEventLog = createEventLog();
