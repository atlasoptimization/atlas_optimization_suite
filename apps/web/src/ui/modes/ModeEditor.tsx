import { useEffect, useState } from "react";
import { DOMAIN_ORDER } from "../../core/constants/domains";
import type { CustomGameMode, DomainVectorValue } from "../../core/types/mode";
import type { DomainName } from "../../core/types/domain";
import {
  customModeToInput,
  emptyCustomModeInput,
  type CustomModeInput
} from "../../storage/localCustomModesStorage";

type ModeEditorProps = {
  mode: CustomGameMode | null;
  onSave: (input: CustomModeInput) => void;
  onCancel: () => void;
};

const vectorValues: DomainVectorValue[] = ["A", "F", "C", "R"];

export function ModeEditor({ mode, onSave, onCancel }: ModeEditorProps) {
  const [input, setInput] = useState<CustomModeInput>(emptyCustomModeInput);

  useEffect(() => {
    setInput(mode ? customModeToInput(mode) : emptyCustomModeInput());
  }, [mode]);

  function update(field: keyof CustomModeInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function updateVector(domain: DomainName, value: DomainVectorValue) {
    setInput((current) => ({
      ...current,
      domainVector: {
        ...current.domainVector,
        [domain]: value
      }
    }));
  }

  return (
    <section className="mode-editor">
      <h3>{mode ? "Edit custom mode" : "New custom mode"}</h3>
      <Field label="Name" value={input.name} onChange={(value) => update("name", value)} />
      <Field label="Purpose" value={input.purpose} onChange={(value) => update("purpose", value)} />
      <Field label="Description" value={input.description} onChange={(value) => update("description", value)} multiline />

      <div className="mode-editor-vector">
        {DOMAIN_ORDER.map((domain) => (
          <label key={domain}>
            {domain}
            <select
              value={input.domainVector[domain]}
              onChange={(event) =>
                updateVector(domain, event.target.value as DomainVectorValue)
              }
            >
              {vectorValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <Field
        label="Setup instructions"
        value={input.setupInstructions}
        onChange={(value) => update("setupInstructions", value)}
        multiline
      />
      <Field label="Procedure" value={input.procedure} onChange={(value) => update("procedure", value)} multiline />
      <Field label="Notes" value={input.notes} onChange={(value) => update("notes", value)} multiline />

      <div className="mode-editor-actions">
        <button type="button" onClick={() => onSave(input)}>
          Save mode
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
