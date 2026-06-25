export type CardOrigin = "deck" | "custom" | "custom-domain";

export type DeckCard = {
  id: string;
  origin?: CardOrigin;
  customDomainId?: string;
  cardname: string;
  domain: string;
  subdomain: string;
  summary: string;
  twin: string;
  keywords: string[];
  question: string;
  story: string;
  effectGood: string;
  effectBad: string;
  effectMod: string;
  frontThumbImage?: string | null;
  backThumbImage?: string | null;
  frontImage?: string | null;
  backImage?: string | null;
  frontReadingImage?: string | null;
  backReadingImage?: string | null;
  imagePath?: string | null;
  pdfPath?: string | null;
  raw: Record<string, string>;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomCard = DeckCard & {
  id: `custom-${string}` | `custom:${string}`;
  origin: "custom";
  isCustom: true;
  createdAt: string;
  updatedAt: string;
};

export type DeckManifest = {
  version: string;
  generatedAt: string;
  handbook?: {
    pdfPath: string;
  };
  topologyBackgrounds?: Record<
    string,
    Partial<Record<"thematic" | "zonal" | "uniform", string>>
  >;
  domains: string[];
  cardCount: number;
  cards: DeckCard[];
};
