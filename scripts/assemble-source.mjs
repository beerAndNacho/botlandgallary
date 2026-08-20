import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const manifests = [
  {
    target: "src/bot-engine.ts",
    parts: [
      "source-parts/bot-engine.ts.gz.b64.part1",
      "source-parts/bot-engine.ts.gz.b64.part2",
    ],
    sha256: "8563bac9b54d6d0257d936799a72aa15c554b8806410f0cb1e3de4bfb456a473",
  },
  {
    target: "src/main.ts",
    parts: ["source-parts/main.ts.gz.b64"],
    sha256: "5de00c5443c007bf18466e669942652c6427d9a3542d6b0095553f769674f6c3",
  },
  {
    target: "src/styles.css",
    parts: ["source-parts/styles.css.gz.b64"],
    sha256: "65a6d9ac926826df22deb2146c174a58026de0cdaf933c8a17d500793d7cb02b",
  },
];

for (const manifest of manifests) {
  const target = resolve(manifest.target);
  const partsAvailable = manifest.parts.every((part) => existsSync(resolve(part)));

  if (!partsAvailable) {
    if (existsSync(target)) continue;
    throw new Error(`Missing source archive for ${manifest.target}`);
  }

  const encoded = manifest.parts
    .map((part) => readFileSync(resolve(part), "utf8").trim())
    .join("");
  const source = gunzipSync(Buffer.from(encoded, "base64"));
  const digest = createHash("sha256").update(source).digest("hex");

  if (digest !== manifest.sha256) {
    throw new Error(`Source integrity check failed for ${manifest.target}`);
  }

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
  console.log(`Materialized ${manifest.target}`);
}
