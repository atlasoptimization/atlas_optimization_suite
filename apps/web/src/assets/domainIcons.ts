import { DOMAIN_ORDER } from "../core/constants/domains";

export function getDomainSymbolPath(domain: string): string | null {
  if (!DOMAIN_ORDER.includes(domain as (typeof DOMAIN_ORDER)[number])) return null;
  return `${import.meta.env.BASE_URL}deck/icons/${domain}_Symbol.png`;
}
