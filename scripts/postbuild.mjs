import fs from "fs";
import path from "path";

const root = process.cwd();
const distAssets = path.join(root, "dist", "client", "assets");
const publicAssets = path.join(root, "public", "assets");

if (!fs.existsSync(distAssets)) {
  console.error("dist/client/assets not found:", distAssets);
  process.exit(1);
}

fs.rmSync(publicAssets, { recursive: true, force: true });
fs.mkdirSync(publicAssets, { recursive: true });

for (const file of fs.readdirSync(distAssets)) {
  fs.copyFileSync(
    path.join(distAssets, file),
    path.join(publicAssets, file)
  );
}

console.log("Copied dist/client/assets -> public/assets");