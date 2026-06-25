export const CUSTOM_DOMAINS_RELATIVE_PATH = "custom_domains/";
export const CUSTOM_DOMAINS_SYNC_COMMAND = "pnpm sync:assets";

export function getCustomDomainsFolderPath() {
  return CUSTOM_DOMAINS_RELATIVE_PATH;
}

export function getCustomDomainsSyncCommand() {
  return CUSTOM_DOMAINS_SYNC_COMMAND;
}
