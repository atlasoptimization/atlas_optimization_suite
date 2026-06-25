import type { DeckCard } from "../../core/types/card";
import type { SessionState, SessionSynthesis } from "../../core/types/session";
import { createSessionMarkdown } from "./sessionMarkdown";
import { SessionLogEditor } from "./SessionLogEditor";
import { SessionHistoryLog } from "./SessionHistoryLog";

type SessionPanelProps = {
  session: SessionState;
  onRename: (title: string) => void;
  onMetadataChange: (metadata: { question?: string; context?: string }) => void;
  onSynthesisChange: (synthesis: Partial<SessionSynthesis>) => void;
  onConclusionChange: (conclusion: string) => void;
  onNextMoveChange: (nextMove: string) => void;
  cardsById: Map<string, DeckCard>;
  onClearLog: () => void;
};

export function SessionPanel({
  session,
  onRename,
  onMetadataChange,
  onSynthesisChange,
  onConclusionChange,
  onNextMoveChange,
  cardsById,
  onClearLog
}: SessionPanelProps) {
  const markdown = createSessionMarkdown(session);

  return (
    <section className="session-panel" data-testid="session-panel">
      <h2>Session</h2>
      <label>
        Title
        <input
          value={session.title}
          onChange={(event) => onRename(event.target.value)}
        />
      </label>

      <SessionLogEditor
        question={session.question ?? ""}
        context={session.context ?? ""}
        synthesis={session.synthesis ?? {}}
        conclusion={session.conclusion ?? ""}
        nextMove={session.nextMove ?? ""}
        onMetadataChange={onMetadataChange}
        onSynthesisChange={onSynthesisChange}
        onConclusionChange={onConclusionChange}
        onNextMoveChange={onNextMoveChange}
      />

      <details className="markdown-preview">
        <summary>Markdown preview</summary>
        <pre>{markdown}</pre>
      </details>

      <SessionHistoryLog log={session.log} cardsById={cardsById} onClearLog={onClearLog} />
    </section>
  );
}
