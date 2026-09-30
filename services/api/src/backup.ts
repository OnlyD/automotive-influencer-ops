import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve, join, sep } from "node:path";
import { hashFile, verifyAsset, type MediaAsset } from "@automotive/media";
import type { FileOperationStore } from "./store.js";
export async function backupStore(
  store: FileOperationStore,
  destination: string,
): Promise<string> {
  const target = resolve(destination);
  if (
    target === store.root ||
    target.startsWith(store.root + sep) ||
    store.root.startsWith(target + sep)
  )
    throw new Error(
      "Backup must be outside and separate from operational storage.",
    );
  return store.transaction(async (state) => {
    const media: MediaAsset[] = [
      ...state.assets,
      ...state.artifacts
        .filter((a) => ["MASTER", "CLIP"].includes(a.kind))
        .map((a) => (a.payload as { asset: MediaAsset }).asset),
    ];
    for (const asset of media) await verifyAsset(store.root, asset);
    await mkdir(target, { recursive: false, mode: 0o700 });
    try {
      const statePath = join(target, "state.json");
      await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", {
        mode: 0o600,
      });
      const files: Array<{ path: string; hash: string }> = [];
      for (const asset of new Map(media.map((a) => [a.path, a])).values()) {
        const path = relative(store.root, asset.path);
        const output = join(target, path);
        await mkdir(resolve(output, ".."), { recursive: true });
        await cp(asset.path, output, { errorOnExist: true, force: false });
        if ((await hashFile(output)) !== asset.hash)
          throw new Error("Backup media hash mismatch.");
        files.push({ path, hash: asset.hash });
      }
      await writeFile(
        join(target, "backup.json"),
        JSON.stringify(
          {
            schemaVersion: "1.0.0",
            originalStorageRoot: store.root,
            stateHash: await hashFile(statePath),
            files,
          },
          null,
          2,
        ) + "\n",
        { mode: 0o600 },
      );
      return target;
    } catch (error) {
      await rm(target, { recursive: true, force: true });
      throw error;
    }
  });
}
export async function restoreStore(
  store: FileOperationStore,
  source: string,
): Promise<void> {
  const backup = resolve(source),
    manifest = JSON.parse(
      await readFile(join(backup, "backup.json"), "utf8"),
    ) as {
      schemaVersion: string;
      originalStorageRoot: string;
      stateHash: string;
      files: Array<{ path: string; hash: string }>;
    };
  if (
    manifest.schemaVersion !== "1.0.0" ||
    manifest.originalStorageRoot !== store.root ||
    backup === store.root ||
    backup.startsWith(store.root + sep)
  )
    throw new Error(
      "Restore requires the original storage root and a separate versioned backup.",
    );
  if ((await hashFile(join(backup, "state.json"))) !== manifest.stateHash)
    throw new Error("Backup state hash mismatch.");
  for (const file of manifest.files) {
    if (
      resolve(backup, file.path) === backup ||
      !resolve(backup, file.path).startsWith(backup + sep) ||
      (await hashFile(join(backup, file.path))) !== file.hash
    )
      throw new Error("Backup media path or hash is invalid.");
  }
  try {
    if ((await readdir(store.root)).length)
      throw new Error(
        "Restore target is not empty; preserve current state before recovery.",
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(store.root, { recursive: true, mode: 0o700 });
  for (const file of manifest.files) {
    const target = join(store.root, file.path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(join(backup, file.path), target, {
      errorOnExist: true,
      force: false,
    });
  }
  await cp(join(backup, "state.json"), join(store.root, "state.json"), {
    errorOnExist: true,
    force: false,
  });
}
