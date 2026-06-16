export type UploadResult = {
  url: string;
  pathname: string;
  contentType: string;
};

/**
 * Backend-agnostic upload surface. The single call site (the file-upload route)
 * depends only on this, so the storage backend is a config switch (spec
 * section 4): GCS in deploy, a local data-URL backend in dev.
 */
export type StorageAdapter = {
  upload(
    pathname: string,
    data: ArrayBuffer,
    contentType: string
  ): Promise<UploadResult>;
};
