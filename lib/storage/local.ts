import type { StorageAdapter } from "./types";

/**
 * Local development backend. Returns the uploaded file as a data URL so dev and
 * e2e work with no external storage or credentials. Not for production (data
 * URLs are unbounded in the row that stores them); deploy uses the GCS backend.
 */
export function createLocalStorage(): StorageAdapter {
  return {
    upload(pathname, data, contentType) {
      const base64 = Buffer.from(data).toString("base64");
      return Promise.resolve({
        url: `data:${contentType};base64,${base64}`,
        pathname,
        contentType,
      });
    },
  };
}
