import type { CustomDomainSpec } from "../core/types/customDomain";
import { parseCustomDomainSpecJson } from "../customDomains/customDomainSpec";

const STORAGE_KEY = "dsd.customDomains";

export function loadCustomDomains(): CustomDomainSpec[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        try {
          return parseCustomDomainSpecJson(JSON.stringify(entry)).domain;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is CustomDomainSpec => entry !== null);
  } catch {
    return [];
  }
}

export function saveCustomDomains(domains: CustomDomainSpec[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
}
