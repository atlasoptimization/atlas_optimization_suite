import { resolvePublicAssetUrl } from "./publicAssetUrl";

export function resolveManualPdfUrl(handbookPath: string | null | undefined) {
  return resolvePublicAssetUrl(handbookPath);
}
