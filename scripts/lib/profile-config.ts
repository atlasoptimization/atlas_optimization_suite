import fs from "node:fs";
import path from "node:path";

export type DeploymentProfileId = "local-full" | "public-demo" | "local-release";

export type ProfileFeatureFlags = {
  enableLocalSaveLoad: boolean;
  enableSessionJsonImportExport: boolean;
  enableCustomAssets: boolean;
  enableCustomCards: boolean;
  enableCustomDomains: boolean;
  enableDeveloperPanel: boolean;
  enableAskAiContextExport: boolean;
  enableTimers: boolean;
  enableDeskPngExport: boolean;
};

export type AssetProfile = {
  includedDomains: string[];
  includeCustomDomains: boolean;
  includePdfs: boolean;
  includePreviews: boolean;
  includeHandbook: boolean;
  includeBackgrounds: boolean;
  includeIcons: boolean;
  allowPrivateSyncRoots: boolean;
  note?: string;
};

export type DeploymentProfile = {
  id: DeploymentProfileId;
  description: string;
  basePath: string;
  githubUrl: string;
  releaseUrl: string;
  features: ProfileFeatureFlags;
  assets: AssetProfile;
};

const profileIds = new Set(["local-full", "public-demo", "local-release"]);

export function loadDeploymentProfile(
  profileId: string | undefined = process.env.DSD_PROFILE
): DeploymentProfile {
  const id = normalizeDeploymentProfileId(profileId);
  const file = path.resolve("config", "profiles", `${id}.json`);
  const profile = JSON.parse(fs.readFileSync(file, "utf8")) as DeploymentProfile;
  validateProfile(profile, file);
  return profile;
}

export function normalizeDeploymentProfileId(value: string | undefined): DeploymentProfileId {
  if (value && profileIds.has(value)) return value as DeploymentProfileId;
  return "local-full";
}

function validateProfile(profile: DeploymentProfile, file: string) {
  if (!profileIds.has(profile.id)) throw new Error(`Invalid profile id in ${file}: ${profile.id}`);
  if (!profile.basePath) throw new Error(`Missing basePath in ${file}`);
  if (!profile.features) throw new Error(`Missing features in ${file}`);
  if (!profile.assets) throw new Error(`Missing assets in ${file}`);
}
