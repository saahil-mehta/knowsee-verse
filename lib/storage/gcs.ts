import { getConfig } from "@/lib/config";
import type { StorageAdapter } from "./types";

/**
 * Google Cloud Storage backend (deploy). Uses Application Default Credentials
 * (the Cloud Run runtime service account), so no key material is handled here.
 * The SDK is imported lazily so the local backend never pulls it in.
 *
 * Returns a public object URL; the uploads bucket is provisioned with public
 * read on the `uploads/` prefix by the Terraform harness (Phase E). Switch to
 * signed URLs here if the bucket must stay private.
 */
export function createGcsStorage(): StorageAdapter {
  return {
    async upload(pathname, data, contentType) {
      const { storage } = getConfig();
      if (!storage.gcsBucket) {
        throw new Error(
          'STORAGE_BACKEND="gcs" but GCS_BUCKET is not set; cannot upload'
        );
      }

      const { Storage } = await import("@google-cloud/storage");
      const bucket = new Storage().bucket(storage.gcsBucket);
      const objectName = `uploads/${Date.now()}-${pathname}`;

      await bucket.file(objectName).save(Buffer.from(data), {
        contentType,
        resumable: false,
      });

      return {
        url: `https://storage.googleapis.com/${storage.gcsBucket}/${objectName}`,
        pathname: objectName,
        contentType,
      };
    },
  };
}
