import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const src = "node_modules/pagedjs/dist/paged.polyfill.js";
const dest = "public/vendor/paged.polyfill.js";

if (!existsSync(src)) {
  console.warn(
    `[copy-pagedjs] source not found at ${src}; skipping (install pagedjs first)`
  );
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pagedjs] copied ${src} → ${dest}`);
