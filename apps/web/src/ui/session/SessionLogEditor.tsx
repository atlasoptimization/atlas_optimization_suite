import type { SessionSynthesis } from "../../core/types/session";

type SessionLogEditorProps = {
  question: string;
  context: string;
  synthesis: SessionSynthesis;
  conclusion: string;
  nextMove: string;
  onMetadataChange: (metadata: { question?: string; context?: string }) => void;
  onSynthesisChange: (synthesis: Partial<SessionSynthesis>) => void;
  onConclusionChange: (conclusion: string) => void;
  onNextMoveChange: (nextMove: string) => void;
};

export function SessionLogEditor({
  question,
  context,
  synthesis,
  conclusion,
  nextMove,
  onMetadataChange,
  onSynthesisChange,
  onConclusionChange,
  onNextMoveChange
}: SessionLogEditorProps) {
  return (
    <div className="session-log-editor">
      <Field
        label="Question"
        value={question}
        onChange={(value) => onMetadataChange({ question: value })}
      />
      <Field
        label="Context"
        value={context}
        onChange={(value) => onMetadataChange({ context: value })}
      />
      <Field
        label="Expected"
        value={synthesis.expected ?? ""}
        onChange={(value) => onSynthesisChange({ expected: value })}
      />
      <Field
        label="Surprise"
        value={synthesis.surprise ?? ""}
        onChange={(value) => onSynthesisChange({ surprise: value })}
      />
      <Field
        label="Noteworthy"
        value={synthesis.noteworthy ?? ""}
        onChange={(value) => onSynthesisChange({ noteworthy: value })}
      />
      <Field
        label="Insight"
        value={synthesis.insight ?? ""}
        onChange={(value) => onSynthesisChange({ insight: value })}
      />
      <Field label="Conclusion" value={conclusion} onChange={onConclusionChange} />
      <Field label="Next move" value={nextMove} onChange={onNextMoveChange} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
