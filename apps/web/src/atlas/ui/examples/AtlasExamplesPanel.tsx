import type { AtlasBuiltinExample } from "../../core/builtinExamples";

type AtlasExamplesPanelProps = {
  open: boolean;
  examples: AtlasBuiltinExample[];
  onLoad: (exampleId: AtlasBuiltinExample["id"]) => void;
  onTutorial: (exampleId: AtlasBuiltinExample["id"]) => void;
  onClose: () => void;
};

export function AtlasExamplesPanel({
  open,
  examples,
  onLoad,
  onTutorial,
  onClose
}: AtlasExamplesPanelProps) {
  if (!open) return null;
  return (
    <aside className="atlas-examples-panel" aria-label="Atlas examples">
      <header>
        <p className="atlas-eyebrow">Examples</p>
        <h2>Built-in CVXPY examples</h2>
        <button type="button" onClick={onClose}>Close</button>
      </header>
      {examples.map((example) => (
        <article key={example.id}>
          <h3>{example.title}</h3>
          <p>{example.description}</p>
          <em>{example.expected}</em>
          <div>
            <button type="button" onClick={() => onLoad(example.id)}>Load Example</button>
            <button type="button" onClick={() => onTutorial(example.id)}>Guided tutorial</button>
          </div>
        </article>
      ))}
    </aside>
  );
}
