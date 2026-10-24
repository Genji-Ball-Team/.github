#!/usr/bin/env node
// Checks file sizes against STYLE.md (File size). Run from the repo root: with no arguments it checks
// every tracked Rust and OverPy file, with paths it checks just those (the pre-commit hook passes the
// staged files). Exits 1 when a file is over the limit or the known-exceptions list is out of date.
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { exceptionsFile, git, readExceptions, splitPaths } from "../lib/repo.js";
import { checkSize, extensionOf, isCountable, scannedExtensions } from "../lib/size.js";

const root = process.cwd();
const given = process.argv.slice(2).map((path) => path.replaceAll("\\", "/"));
const files = given.length > 0 ? given : splitPaths(git(["ls-files", "-z"], root));
const exceptions = new Set(readExceptions(root));
let failed = false;

/** @param {string} message */
function fail(message) {
  console.error(`fail  ${message}`);
  failed = true;
}

for (const path of files) {
  if (!scannedExtensions.includes(extensionOf(path)) || exceptions.has(path) || !existsSync(path)) {
    continue;
  }
  const result = checkSize(path, readFileSync(path, "utf8"));
  if (result.level === "fail") {
    fail(
      `${path}: ${result.lines} lines, over the ${result.limit} limit. Split it (STYLE.md, File size)`,
    );
  } else if (result.level === "warn") {
    console.warn(`warn  ${path}: ${result.lines} lines, over ${result.limit}`);
  }
}

// The list only shrinks: an entry that's gone or back under the limit has to come off it.
const toCheck =
  given.length > 0 ? [...exceptions].filter((path) => given.includes(path)) : exceptions;
for (const path of toCheck) {
  if (!existsSync(path)) {
    fail(`${exceptionsFile}: ${path} doesn't exist any more. Take it off the list`);
  } else if (isCountable(path) && checkSize(path, readFileSync(path, "utf8")).level !== "fail") {
    fail(`${exceptionsFile}: ${path} is under the limit now. Take it off the list`);
  }
}

if (failed) process.exitCode = 1;
