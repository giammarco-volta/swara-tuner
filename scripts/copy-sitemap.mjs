import fs from "fs";
import path from "path";

const mode = process.argv[2];

if (!mode || !["swara", "micro"].includes(mode)) {
  console.error("Usage: node scripts/copy-sitemap.mjs <swara|micro>");
  process.exit(1);
}

const source = path.join("public", `sitemap-${mode}.xml`);
const dest = path.join("public", "sitemap.xml");

fs.copyFileSync(source, dest);

console.log(`Copied ${source} -> ${dest}`);