#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const targets = ["apps", "packages", "scripts", "biome.json", "package.json", "README.md"];

let bin = "biome";
try {
  const rootRequire = createRequire(import.meta.url);
  const biomeRequire = createRequire(rootRequire.resolve("@biomejs/biome/package.json"));
  const platformPkg = `@biomejs/cli-${process.platform}-${process.arch}`;
  const candidate = join(dirname(biomeRequire.resolve(`${platformPkg}/package.json`)), "biome");
  if (existsSync(candidate)) bin = candidate;
} catch {
  bin = "biome";
}

const write = process.argv.includes("--write");
const env = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "" };
try {
  execFileSync(bin, ["check", ...(write ? ["--write"] : []), ...targets], { stdio: "inherit", env });
} catch (e) {
  process.exit(typeof e?.status === "number" ? e.status : 1);
}
