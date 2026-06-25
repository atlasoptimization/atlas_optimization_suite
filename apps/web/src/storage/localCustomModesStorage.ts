import { DOMAIN_ORDER } from "../core/constants/domains";
import type { DomainName } from "../core/types/domain";
import type { CustomGameMode, DomainVectorValue } from "../core/types/mode";

const STORAGE_KEY = "dsd.customModes";

const vectorValues: DomainVectorValue[] = ["A", "F", "C", "R"];

export type CustomModeInput = {
  name: string;
  purpose: string;
  description: string;
  domainVector: Record<DomainName, DomainVectorValue>;
  setupInstructions: string;
  procedure: string;
  notes: string;
};

export function emptyCustomModeInput(): CustomModeInput {
  return {
    name: "",
    purpose: "",
    description: "",
    domainVector: Object.fromEntries(
      DOMAIN_ORDER.map((domain) => [domain, "C"])
    ) as Record<DomainName, DomainVectorValue>,
    setupInstructions: "",
    procedure: "",
    notes: ""
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function makeCustomModeId() {
  return `custom-mode-${Date.now()}-${Math.random().toString(16).slice(2)}` as const;
}

function parseSetupInstructions(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDomainVector(value: unknown): Record<DomainName, DomainVectorValue> {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    DOMAIN_ORDER.map((domain) => {
      const entry = source[domain];
      return [domain, vectorValues.includes(entry as DomainVectorValue) ? entry : "C"];
    })
  ) as Record<DomainName, DomainVectorValue>;
}

export function createCustomMode(input: CustomModeInput): CustomGameMode {
  return {
    id: makeCustomModeId(),
    isCustom: true,
    name: input.name.trim() || "Untitled custom mode",
    purpose: input.purpose.trim(),
    description: input.description.trim(),
    domainVector: input.domainVector,
    setupInstructions: parseSetupInstructions(input.setupInstructions),
    procedure: input.procedure.trim(),
    notes: input.notes.trim()
  };
}

export function updateCustomMode(
  mode: CustomGameMode,
  input: CustomModeInput
): CustomGameMode {
  return {
    ...createCustomMode(input),
    id: mode.id
  };
}

export function customModeToInput(mode: CustomGameMode): CustomModeInput {
  return {
    name: mode.name,
    purpose: mode.purpose,
    description: mode.description,
    domainVector: mode.domainVector,
    setupInstructions: mode.setupInstructions.join("\n"),
    procedure: mode.procedure,
    notes: mode.notes ?? ""
  };
}

function normalizeCustomMode(value: unknown): CustomGameMode | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  if (!id.startsWith("custom-mode-")) return null;

  const setupInstructions = Array.isArray(value.setupInstructions)
    ? value.setupInstructions.filter(
        (instruction): instruction is string => typeof instruction === "string"
      )
    : parseSetupInstructions(stringField(value.setupInstructions));

  return {
    id: id as `custom-mode-${string}`,
    isCustom: true,
    name: stringField(value.name) || "Untitled custom mode",
    purpose: stringField(value.purpose),
    description: stringField(value.description),
    domainVector: normalizeDomainVector(value.domainVector),
    setupInstructions,
    procedure: stringField(value.procedure),
    notes: stringField(value.notes)
  };
}

export function loadCustomModes(): CustomGameMode[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => normalizeCustomMode(entry))
      .filter((entry): entry is CustomGameMode => entry !== null);
  } catch {
    return [];
  }
}

export function saveCustomModes(modes: CustomGameMode[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
}
