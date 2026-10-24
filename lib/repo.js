import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseExceptions } from "./size.js";

/** The known-exceptions list: files over the size limit, each with an issue to split it. */
export const exceptionsFile = ".size-exceptions";

/**
 * The paths on the repo's known-exceptions list, or none when it has no list.
 * @param {string} root the repo root
 */
export function readExceptions(root) {
  const path = join(root, exceptionsFile);
  return existsSync(path) ? parseExceptions(readFileSync(path, "utf8")) : [];
}

/**
 * Runs git and returns its output, or undefined when git fails (not a repo, git missing).
 * @param {string[]} args
 * @param {string} cwd
 */
export function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // Not a git checkout, so there's nothing to list or install into; callers treat it as "no repo".
    return undefined;
  }
}

/**
 * Splits git's `-z` output into paths.
 * @param {string | undefined} output
 */
export function splitPaths(output) {
  return (output ?? "").split("\0").filter((path) => path !== "");
}
