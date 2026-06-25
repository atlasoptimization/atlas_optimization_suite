import type { DomainName } from "../types/domain";

export const DOMAIN_ORDER: DomainName[] = [
  "Source",
  "Structure",
  "Chameleon",
  "Void",
  "Volition",
  "Aspect"
];

export function domainClass(domain: string) {
  return `domain-${domain.toLowerCase()}`;
}
