import type { DeckCard } from "../../core/types/card";
import type { SessionLogEntry } from "../../core/types/session";
import { sessionLogToMarkdown } from "../../engine/sessionLog";

type SessionHistoryLogProps = {
  log: SessionLogEntry[];
  cardsById: Map<string, DeckCard>;
  onClearLog: () => void;
};

export function SessionHistoryLog({ log, cardsById, onClearLog }: SessionHistoryLogProps) {
  async function copyMarkdown() {
    await navigator.clipboard.writeText(sessionLogToMarkdown(log));
  }

  return (
    <section className="session-history-log">
      <div className="session-history-header">
        <h3>History / Log</h3>
        <div>
          <button type="button" onClick={copyMarkdown} disabled={log.length === 0}>
            Copy Markdown
          </button>
          <button type="button" onClick={onClearLog} disabled={log.length === 0}>
            Clear log
          </button>
        </div>
      </div>

      {log.length === 0 ? (
        <p className="muted">No session events recorded.</p>
      ) : (
        <ol className="session-history-list">
          {[...log].reverse().map((entry) => (
            <li key={entry.id}>
              <time>{formatTime(entry.timestamp)}</time>
              <span>{entry.label}</span>
              {entry.cardId && <small>{cardsById.get(entry.cardId)?.cardname ?? entry.cardId}</small>}
              {!entry.cardId && entry.domain && <small>{entry.domain}</small>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
