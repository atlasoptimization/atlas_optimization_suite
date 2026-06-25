import type { SessionLogEntry, SessionState } from "../core/types/session";

const MAX_LOG_ENTRIES = 500;

export function createSessionLogEntry(
  input: Omit<SessionLogEntry, "id" | "timestamp">
): SessionLogEntry {
  return {
    ...input,
    id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString()
  };
}

export function appendSessionLog(
  state: SessionState,
  input: Omit<SessionLogEntry, "id" | "timestamp">
): SessionState {
  const entry = createSessionLogEntry(input);
  return {
    ...state,
    log: [...state.log, entry].slice(-MAX_LOG_ENTRIES)
  };
}

export function sessionLogToMarkdown(log: SessionLogEntry[]) {
  if (log.length === 0) return "_No session events recorded._";

  return log
    .map((entry) => {
      const time = new Date(entry.timestamp).toISOString();
      const bits = [entry.label];
      if (entry.domain) bits.push(`domain: ${entry.domain}`);
      if (entry.cardId) bits.push(`card: ${entry.cardId}`);
      return `- ${time} - ${bits.join(" | ")}`;
    })
    .join("\n");
}
