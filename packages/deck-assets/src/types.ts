export type CsvRow = Record<string, string>;

export type ManifestCard = {
  id: string;
  origin?: "deck" | "custom" | "custom-domain";
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
  frontImage: string | null;
  backImage: string | null;
  frontReadingImage?: string | null;
  backReadingImage?: string | null;
  imagePath: string | null;
  pdfPath: string | null;
  raw: CsvRow;
};

export type DeckAssetConfig = {
  csvRoot: string;
  imageRoot: string;
  pdfRoot: string;
  fallbackImageRoot?: string;
  fallbackPdfRoot?: string;
  usingCompressedImageRoot?: boolean;
  usingCompressedPdfRoot?: boolean;
  iconRoot: string | null;
  pdfPreviewDpi: number;
  pdfPreviewThumbHeight: number;
  pdfPreviewReadingHeight: number;
  pdfPreviewFormat: "png" | "webp";
  pdfPreviewWebpQuality: number;
  outRoot: string;
  outImageRoot: string;
  outPdfRoot: string;
  outIconRoot: string;
  outPdfPreviewRoot: string;
  outManifest: string;
  customDomainsRoot: string;
  handbookPdf: string;
  topologyBackgroundRoot: string;
  includedDomains?: string[];
  includeCustomDomains?: boolean;
  includePdfs?: boolean;
  includePreviews?: boolean;
  includeHandbook?: boolean;
  includeBackgrounds?: boolean;
  includeIcons?: boolean;
  cleanOutRoot?: boolean;
};

export type TopologyBackgroundSource = "thematic" | "zonal" | "uniform";

export type TopologyBackgroundManifest = Record<
  string,
  Partial<Record<TopologyBackgroundSource, string>>
>;

export type PdfPreviewSummary = {
  renderer: string | null;
  dpi: number;
  thumbHeight: number;
  readingHeight: number;
  format: string;
  pdfsMatched: number;
  frontPreviewsGenerated: number;
  backPreviewsGenerated: number;
  previewsSkipped: number;
  sampleDimensions: string[];
};

export type BuildManifestSummary = {
  cardCount: number;
  customDomainsFound: number;
  customCardsLoaded: number;
  customDomainDetails: string[];
  customDomainIgnoredFolders: string[];
  handbookPath: string | null;
  topologyBackgrounds: TopologyBackgroundManifest;
  warnings: string[];
  manifestPath: string;
  pdfPreview: PdfPreviewSummary;
};

export type AssetValidationSeverity = "error" | "warning";

export type AssetValidationIssue = {
  severity: AssetValidationSeverity;
  message: string;
  domain?: string;
  cardname?: string;
};

export type AssetValidationReport = {
  cardCount: number;
  countsByDomain: Record<string, number>;
  missingImageCount: number;
  missingPdfCount: number;
  missingRequiredFieldCount: number;
  warnings: AssetValidationIssue[];
  errors: AssetValidationIssue[];
  duplicateIds: string[];
  duplicateCardNames: string[];
};
