import type { ModeRecommendation } from "../core/types/mode";

export function getHighlightedDomainsForRecommendation(
  recommendation: ModeRecommendation | null,
  fallbackDomain?: string | null
) {
  if (!recommendation) {
    return fallbackDomain ? [fallbackDomain] : [];
  }

  if (recommendation.targetDomains?.length) {
    return Array.from(new Set(recommendation.targetDomains));
  }

  if (recommendation?.domains?.length) {
    return Array.from(new Set(recommendation.domains));
  }

  if (recommendation?.domain) {
    return [recommendation.domain];
  }

  return [];
}
