import { resolvePublicAssetUrl } from "./publicAssetUrl";

export function openPdfAsset(pdfPath: string | null | undefined): boolean {
  const url = resolvePublicAssetUrl(pdfPath);
  if (!url) return false;
  if (!/\.pdf(?:$|[?#])/i.test(url)) {
    if (import.meta.env.DEV) {
      console.warn(`Open PDF expected a .pdf asset URL, got: ${url}`);
    }
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
