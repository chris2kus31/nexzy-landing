// Copies MapLibre's web worker into public/ so the site serves it from its
// own origin. MapLibre 6 looks for the worker next to its own module file,
// but the Next bundler renames and moves that file, so the default lookup
// 404s in production. The map components point MapLibre here instead
// (setWorkerUrl). Runs automatically before `npm run dev` and `npm run build`
// so the copy always matches the installed maplibre-gl version.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
const outDir = join(root, "public", "vendor", "maplibre");
mkdirSync(outDir, { recursive: true });
copyFileSync(
  join(pkg, "dist", "maplibre-gl-worker.mjs"),
  join(outDir, "maplibre-gl-worker.js"),
);
console.log(`maplibre-gl ${version} worker copied to public/vendor/maplibre/`);
