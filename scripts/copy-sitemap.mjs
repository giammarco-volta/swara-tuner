import fs from "fs";
import path from "path";

const mode = process.argv[2];

if (!mode || !["swara", "micro"].includes(mode)) {
  console.error("Usage: node scripts/copy-files.mjs <swara|micro>");
  process.exit(1);
}

// sitemap
fs.copyFileSync(
  path.join("public", `sitemap-${mode}.xml`),
  path.join("public", "sitemap.xml")
);

// robots
fs.copyFileSync(
  path.join("public", `robots-${mode}.txt`),
  path.join("public", "robots.txt")
);

console.log(`Copied sitemap and robots for ${mode}`);