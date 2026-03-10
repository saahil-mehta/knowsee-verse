// ---------------------------------------------------------------------------
// Ephemeral in-memory store for generated file downloads.
// Files are stored with a UUID key and auto-expire after 5 minutes.
// Used by the generatePptx tool to make files downloadable via URL.
// ---------------------------------------------------------------------------

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

type StoredFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  expiresAt: number;
};

const store = new Map<string, StoredFile>();

export function storeFile(
  id: string,
  file: { buffer: Buffer; filename: string; contentType: string }
) {
  // Clean up expired entries on each write
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }

  store.set(id, {
    ...file,
    expiresAt: now + EXPIRY_MS,
  });
}

export function getFile(id: string): StoredFile | undefined {
  const entry = store.get(id);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return undefined;
  }
  return entry;
}
