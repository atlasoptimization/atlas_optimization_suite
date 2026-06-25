import type { CustomCard } from "./card";

export type CustomDomainSubdomain = {
  name: string;
  description?: string;
};

export type CustomDomainSpec = {
  schemaVersion: 1;
  domainId: string;
  domainName: string;
  shortName: string;
  description: string;
  color: string;
  symbolPath?: string;
  cardsCsv?: string;
  imagesFolder?: string;
  domainMasterCardName?: string;
  subdomains: CustomDomainSubdomain[];
  cards: CustomCard[];
  importedAt: string;
};
