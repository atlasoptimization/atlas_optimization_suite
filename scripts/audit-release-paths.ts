import { auditReleasePaths } from "./lib/release-path-audit";

const findings = auditReleasePaths();

if (findings.length > 0) {
  console.error("Forbidden private/runtime paths found:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.pattern}] ${finding.snippet}`);
  }
  process.exit(1);
}

console.log("Release path audit passed: no forbidden private paths found.");
