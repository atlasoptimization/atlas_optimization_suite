import { spawnSync } from "node:child_process";
import { loadDeploymentProfile, normalizeDeploymentProfileId } from "./lib/profile-config";

const profileId = normalizeDeploymentProfileId(process.argv[2]);
const target = process.argv[3] ?? profileId;
const profile = loadDeploymentProfile(profileId);
const basePath =
  process.env.PUBLIC_BASE_PATH ||
  (target === "atlas"
    ? "/data-science-deck/"
    : target === "local-release"
      ? "./"
      : profile.basePath);

run("pnpm", ["sync:assets", "--profile", profile.id], {
  DSD_PROFILE: profile.id
});

run("pnpm", ["--filter", "@dsd/web", "build"], {
  DSD_PROFILE: profile.id,
  VITE_DSD_FEATURE_PROFILE: profile.id,
  VITE_DSD_GITHUB_URL: profile.githubUrl,
  VITE_DSD_GITHUB_RELEASE_URL: profile.releaseUrl,
  PUBLIC_BASE_PATH: basePath
});

function run(command: string, args: string[], env: Record<string, string>) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...env
    }
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}
