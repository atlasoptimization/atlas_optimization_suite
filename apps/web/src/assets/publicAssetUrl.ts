export function resolvePublicAssetUrl(path: string | null | undefined, baseUrl = import.meta.env.BASE_URL): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;

  const normalizedBase = normalizeBaseUrl(baseUrl);
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  const baseWithoutSlashes = normalizedBase.replace(/^\/+|\/+$/g, "");

  if (baseWithoutSlashes && withoutLeadingSlash === baseWithoutSlashes) {
    return normalizedBase.replace(/\/$/, "");
  }
  if (baseWithoutSlashes && withoutLeadingSlash.startsWith(`${baseWithoutSlashes}/`)) {
    return `/${withoutLeadingSlash}`;
  }

  return `${normalizedBase}${withoutLeadingSlash}`;
}

function normalizeBaseUrl(baseUrl: string) {
  if (baseUrl === "." || baseUrl === "./") return "";
  if (!baseUrl) return "/";
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `/${baseUrl.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/+/, "/");
}
