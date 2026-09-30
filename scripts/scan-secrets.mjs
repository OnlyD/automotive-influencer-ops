import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Deliberately bounded pattern detection; this is not a complete credential classifier.
const patterns = [
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255})\b/g,
  ],
  ["OpenAI key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,255}\b/g],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
];
export function secretFindings(content) {
  const findings = [];
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern))
      findings.push({
        label,
        line: content.slice(0, match.index).split("\n").length,
      });
  }
  return findings;
}
export async function scanTrackedFiles() {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const findings = [];
  for (const file of files) {
    if (
      file.startsWith(".local/") ||
      /\.(?:mp4|mov|mkv|webm|wav|mp3|ogg|flac|sqlite|db)$/i.test(file)
    ) {
      findings.push({ file, label: "Forbidden runtime/media file", line: 1 });
      continue;
    }
    const buffer = await readFile(file);
    if (buffer.includes(0)) continue;
    for (const finding of secretFindings(buffer.toString("utf8")))
      findings.push({ file, ...finding });
  }
  return findings;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const findings = await scanTrackedFiles();
  if (findings.length) {
    // Never print matched credential text.
    for (const finding of findings)
      console.error(`${finding.file}:${finding.line}: ${finding.label}`);
    process.exitCode = 1;
  } else
    console.log("Tracked-tree secret and forbidden-runtime checks passed.");
}
