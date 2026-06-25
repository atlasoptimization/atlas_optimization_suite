import path from "node:path";
import fs from "node:fs";
import { slugify } from "./slugify";

export const ART_IMAGE_FIELD_NAMES = [
  "art",
  "artwork",
  "image",
  "image_path",
  "imagePath",
  "graphics",
  "graphic",
  "card_graphic",
  "cardGraphic",
  "card_art",
  "cardArt",
  "background_image",
  "backgroundImage"
];

export function normalizeCardNameForFilename(s: string): string {
  return String(s ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeAssetName(s: string): string {
  const base = path.basename(s, path.extname(s));
  return normalizeCardNameForFilename(base).toLowerCase();
}

export function buildExpectedPdfFilename(domain: string, nr: string, cardname: string): string {
  return `ML_Card_${normalizeCardNameForFilename(domain)}_${String(nr).trim()}_${normalizeCardNameForFilename(cardname)}.pdf`;
}

export function findBestAsset(files: string[], cardname: string, exts: string[]): string | null {
  const cardSlug = slugify(cardname);
  const candidates = files.filter((file) => exts.includes(path.extname(file).toLowerCase()));

  if (candidates.length === 0) return null;

  const scored = candidates
    .map((file) => {
      const baseSlug = slugify(path.basename(file, path.extname(file)));
      let score = 0;

      if (baseSlug === cardSlug) score += 100;
      if (baseSlug.includes(cardSlug)) score += 80;
      if (cardSlug.includes(baseSlug)) score += 40;

      // prefer front/card/full images over back/detail if names contain this
      if (/front|card|full/i.test(path.basename(file))) score += 10;
      if (/back/i.test(path.basename(file))) score -= 20;

      return { file, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.file ?? null;
}

export function resolveCsvArtAsset({
  artReference,
  files,
  searchRoots,
  exts
}: {
  artReference: string;
  files: string[];
  searchRoots: string[];
  exts: string[];
}): string | null {
  const reference = artReference.trim();
  if (!reference) return null;
  const allowedExts = new Set(exts.map((ext) => ext.toLowerCase()));

  function valid(file: string) {
    return allowedExts.has(path.extname(file).toLowerCase()) && fs.existsSync(file);
  }

  const basenameReference = path.basename(reference);
  if (basenameReference && basenameReference !== reference) {
    for (const root of searchRoots) {
      const basenameCandidate = path.resolve(root, basenameReference);
      if (valid(basenameCandidate)) return basenameCandidate;
      for (const ext of exts) {
        const alternate = replaceExtension(basenameCandidate, ext);
        if (valid(alternate)) return alternate;
      }
    }
  }

  if (path.isAbsolute(reference) && valid(reference)) return reference;

  for (const root of searchRoots) {
    const candidate = path.resolve(root, reference);
    if (valid(candidate)) return candidate;
    for (const ext of exts) {
      const alternate = replaceExtension(candidate, ext);
      if (valid(alternate)) return alternate;
    }
  }

  const referenceBasename = path.basename(reference).toLowerCase();
  const exactBasename = files.find(
    (file) =>
      path.basename(file).toLowerCase() === referenceBasename &&
      allowedExts.has(path.extname(file).toLowerCase())
  );
  if (exactBasename) return exactBasename;

  for (const ext of exts) {
    const alternateBasename = replaceExtension(path.basename(reference), ext).toLowerCase();
    const alternate = files.find(
      (file) =>
        path.basename(file).toLowerCase() === alternateBasename &&
        allowedExts.has(path.extname(file).toLowerCase())
    );
    if (alternate) return alternate;
  }

  const normalizedReference = normalizeAssetName(reference);
  return files.find(
    (file) =>
      normalizeAssetName(file) === normalizedReference &&
      allowedExts.has(path.extname(file).toLowerCase())
  ) ?? null;
}

function replaceExtension(file: string, ext: string) {
  return path.join(path.dirname(file), `${path.basename(file, path.extname(file))}${ext}`);
}

export function findBestPdfAsset(
  files: string[],
  domain: string,
  nr: string,
  cardname: string
): string | null {
  const candidates = files.filter((file) => path.extname(file).toLowerCase() === ".pdf");
  if (candidates.length === 0) return null;

  const trimmedNr = nr.trim();

  if (trimmedNr) {
    const expected = buildExpectedPdfFilename(domain, trimmedNr, cardname);
    const expectedNormalized = normalizeAssetName(expected);
    const exact = candidates.find((file) => normalizeAssetName(file) === expectedNormalized);

    if (exact) return exact;

    const prefix = normalizeAssetName(`ML_Card_${domain}_${trimmedNr}_placeholder`).replace(
      /_placeholder$/,
      ""
    );
    const cardSlug = slugify(cardname);
    const patternCandidates = candidates
      .map((file) => {
        const normalized = normalizeAssetName(file);
        const baseSlug = slugify(path.basename(file, path.extname(file)));
        let score = 0;

        if (!normalized.startsWith(prefix)) return { file, score };
        score += 50;
        if (baseSlug.includes(cardSlug)) score += 40;
        if (cardSlug && baseSlug.endsWith(cardSlug)) score += 30;

        return { file, score };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (patternCandidates[0]) return patternCandidates[0].file;
  }

  return findBestAsset(candidates, cardname, [".pdf"]);
}
