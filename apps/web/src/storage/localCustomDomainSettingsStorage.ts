const STORAGE_KEY = "dsd.customDomainSettings";

export type CustomDomainSettings = {
  activeCustomDomainIds: string[];
};

export const DEFAULT_CUSTOM_DOMAIN_SETTINGS: CustomDomainSettings = {
  activeCustomDomainIds: []
};

export function loadCustomDomainSettings(): CustomDomainSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CUSTOM_DOMAIN_SETTINGS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_CUSTOM_DOMAIN_SETTINGS;
    const record = parsed as Record<string, unknown>;
    const activeCustomDomainIds = Array.isArray(record.activeCustomDomainIds)
      ? record.activeCustomDomainIds
          .filter((entry): entry is string => typeof entry === "string")
      : [];

    return { activeCustomDomainIds };
  } catch {
    return DEFAULT_CUSTOM_DOMAIN_SETTINGS;
  }
}

export function saveCustomDomainSettings(settings: CustomDomainSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
