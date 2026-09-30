import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
export async function assertWorkflowIntegrity(
  directory: string,
  root: string,
): Promise<void> {
  const locks = JSON.parse(
    await readFile(resolve(root, "approved-workflows.json"), "utf8"),
  ) as Record<string, string>;
  const prefix = relative(root, directory).split("\\").join("/");
  const entries = Object.entries(locks).filter(([path]) =>
    path.startsWith(prefix + "/"),
  );
  if (entries.length < 3)
    throw new Error("Workflow has no approved definition fingerprint.");
  for (const [path, expected] of entries) {
    const actual = createHash("sha256")
      .update(await readFile(resolve(root, path)))
      .digest("hex");
    if (actual !== expected)
      throw new Error(
        `Workflow definition differs from the reviewed fingerprint: ${path}`,
      );
  }
}
