export type FeatureProfile = "local-full" | "public-demo" | "local-release";

export type FeatureFlags = {
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

export type FeatureConfig = FeatureFlags & {
  profile: FeatureProfile;
  disabledFeatureMessage: string;
  githubUrl: string;
  releaseUrl: string;
};

export const DEFAULT_GITHUB_URL = "https://github.com/your-org/data-science-deck-app";
export const DEFAULT_GITHUB_RELEASE_URL = `${DEFAULT_GITHUB_URL}/releases`;

export const DISABLED_FEATURE_MESSAGE =
  "This feature is disabled in this build. Download the unrestricted local version from GitHub.";

const FEATURE_PROFILES: Record<FeatureProfile, FeatureFlags> = {
  "local-full": {
    enableLocalSaveLoad: true,
    enableSessionJsonImportExport: true,
    enableCustomAssets: true,
    enableCustomCards: true,
    enableCustomDomains: true,
    enableDeveloperPanel: true,
    enableAskAiContextExport: true,
    enableTimers: true,
    enableDeskPngExport: true
  },
  "public-demo": {
    enableLocalSaveLoad: false,
    enableSessionJsonImportExport: true,
    enableCustomAssets: false,
    enableCustomCards: false,
    enableCustomDomains: false,
    enableDeveloperPanel: false,
    enableAskAiContextExport: true,
    enableTimers: true,
    enableDeskPngExport: true
  },
  "local-release": {
    enableLocalSaveLoad: true,
    enableSessionJsonImportExport: true,
    enableCustomAssets: true,
    enableCustomCards: true,
    enableCustomDomains: true,
    enableDeveloperPanel: false,
    enableAskAiContextExport: true,
    enableTimers: true,
    enableDeskPngExport: true
  }
};

export function getFeatureConfig(
  profile: string | undefined = readFeatureProfile(),
  githubUrl: string | undefined = readGithubUrl(),
  releaseUrl: string | undefined = readReleaseUrl()
): FeatureConfig {
  const resolvedProfile = isFeatureProfile(profile) ? profile : "local-full";
  return {
    profile: resolvedProfile,
    ...FEATURE_PROFILES[resolvedProfile],
    disabledFeatureMessage: DISABLED_FEATURE_MESSAGE,
    githubUrl: githubUrl || DEFAULT_GITHUB_URL,
    releaseUrl: releaseUrl || DEFAULT_GITHUB_RELEASE_URL
  };
}

export const featureConfig = getFeatureConfig();

function readFeatureProfile() {
  return readImportMetaEnv().VITE_DSD_FEATURE_PROFILE;
}

function readGithubUrl() {
  return readImportMetaEnv().VITE_DSD_GITHUB_URL;
}

function readReleaseUrl() {
  return readImportMetaEnv().VITE_DSD_GITHUB_RELEASE_URL;
}

function isFeatureProfile(value: string | undefined): value is FeatureProfile {
  return value === "local-full" || value === "public-demo" || value === "local-release";
}

function readImportMetaEnv() {
  return ((import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env ?? {});
}
