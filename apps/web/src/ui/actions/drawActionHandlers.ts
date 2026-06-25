export function promptForDrawCount(domain: string): number | null {
  const raw = window.prompt(`Draw how many ${domain} cards?`, "3");
  if (raw === null) return null;

  const count = Number.parseInt(raw, 10);
  if (!Number.isFinite(count) || count < 1) return null;

  return count;
}
