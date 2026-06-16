import { getConfig } from "@/lib/config";
import { createGcsStorage } from "./gcs";
import { createLocalStorage } from "./local";
import type { StorageAdapter } from "./types";

export type { StorageAdapter, UploadResult } from "./types";

/** Resolve the storage backend from configuration (spec section 4). */
export function getStorage(): StorageAdapter {
  const { storage } = getConfig();
  if (storage.backend === "gcs") {
    return createGcsStorage();
  }
  return createLocalStorage();
}
