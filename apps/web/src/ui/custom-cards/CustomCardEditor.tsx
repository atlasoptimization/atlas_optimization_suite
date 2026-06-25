import { useEffect, useState } from "react";
import type { CustomCard } from "../../core/types/card";
import type { CustomCardInput } from "../../storage/localCustomCardsStorage";

const EMPTY_INPUT: CustomCardInput = {
  cardname: "",
  domain: "Custom",
  subdomain: "",
  summary: "",
  twin: "",
  keywords: "",
  question: "",
  story: "",
  effectGood: "",
  effectBad: "",
  effectMod: ""
};

type CustomCardEditorProps = {
  card: CustomCard | null;
  onSave: (input: CustomCardInput) => void;
  onCancel: () => void;
};

export function CustomCardEditor({ card, onSave, onCancel }: CustomCardEditorProps) {
  const [input, setInput] = useState<CustomCardInput>(EMPTY_INPUT);
  const canSave = input.cardname.trim().length > 0;

  useEffect(() => {
    if (!card) {
      setInput(EMPTY_INPUT);
      return;
    }

    setInput({
      cardname: card.cardname,
      domain: card.domain,
      subdomain: card.subdomain,
      summary: card.summary,
      twin: card.twin,
      keywords: card.keywords.join(", "),
      question: card.question,
      story: card.story,
      effectGood: card.effectGood,
      effectBad: card.effectBad,
      effectMod: card.effectMod
    });
  }, [card]);

  function update(field: keyof CustomCardInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="custom-card-editor">
      <h3>{card ? "Edit custom card" : "New custom card"}</h3>
      <Field label="Name" value={input.cardname} onChange={(value) => update("cardname", value)} />
      <Field label="Domain" value={input.domain} onChange={(value) => update("domain", value)} />
      <Field label="Subdomain" value={input.subdomain} onChange={(value) => update("subdomain", value)} />
      <Field label="Summary" value={input.summary} onChange={(value) => update("summary", value)} multiline />
      <Field label="Scientific twin" value={input.twin} onChange={(value) => update("twin", value)} />
      <Field label="Keywords" value={input.keywords} onChange={(value) => update("keywords", value)} />
      <Field label="Question" value={input.question} onChange={(value) => update("question", value)} multiline />
      <Field label="Story" value={input.story} onChange={(value) => update("story", value)} multiline />
      <Field label="Virtue" value={input.effectGood} onChange={(value) => update("effectGood", value)} multiline />
      <Field label="Pathology" value={input.effectBad} onChange={(value) => update("effectBad", value)} multiline />
      <Field label="Modifier" value={input.effectMod} onChange={(value) => update("effectMod", value)} multiline />

      <div className="custom-card-editor-actions">
        <button type="button" onClick={() => onSave(input)} disabled={!canSave}>
          Save card
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
