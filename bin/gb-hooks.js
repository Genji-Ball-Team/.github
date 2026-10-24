#!/usr/bin/env node
// The pre-commit hook from STYLE.md (Tools), an early warning before CI.
//   gb-hooks install     writes .git/hooks/pre-commit (run it from the repo's "prepare" script)
//   gb-hooks pre-commit  what the hook runs: Prettier, ESLint and the size check on the staged files
// Each tool runs only if the repo has it installed, so CE (no Prettier or ESLint) gets the size check.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { git, splitPaths } from "../lib/repo.js";

const marker = "Installed by @genji-ball-team/style";
const lintable = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const root = process.cwd();
const command = process.argv[2] ?? "install";

if (command === "install") install();
else if (command === "pre-commit") preCommit();
else {
  console.error(`gb-hooks: unknown command "${command}". Use install or pre-commit`);
  process.exitCode = 1;
}

function install() {
  if (process.env.CI) return;
  const top = git(["rev-parse", "--show-toplevel"], root)?.trim();
  const hooks = git(["rev-parse", "--git-path", "hooks"], root)?.trim();
  if (!top || !hooks) return;
  const hook = resolve(root, hooks, "pre-commit");
  if (existsSync(hook) && !readFileSync(hook, "utf8").includes(marker)) {
    console.warn(`gb-hooks: ${hook} is someone else's hook, so it's left alone`);
    return;
  }
  // The hook runs from the repo root, so the script path is relative to it and survives a moved clone.
  const script = relative(top, fileURLToPath(import.meta.url)).replaceAll("\\", "/");
  mkdirSync(dirname(hook), { recursive: true });
  writeFileSync(
    hook,
    [
      "#!/bin/sh",
      `# ${marker}. Skip it once with git commit --no-verify; CI still checks.`,
      `script="${script}"`,
      'if [ ! -f "$script" ]; then echo "pre-commit: run npm install to get the checks back"; exit 0; fi',
      'exec node "$script" pre-commit',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
}

function preCommit() {
  const staged = splitPaths(
    git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], root),
  );
  if (staged.length === 0) return;
  const lintFiles = staged.filter((path) => lintable.test(path));
  const runs = [
    run("prettier", "prettier", ["--check", "--ignore-unknown", ...staged]),
    lintFiles.length > 0 ? run("eslint", "eslint", ["--no-warn-ignored", ...lintFiles]) : true,
    runScript(join(dirname(fileURLToPath(import.meta.url)), "gb-size.js"), staged),
  ];
  if (runs.includes(false)) {
    console.error("pre-commit: fix the above, or commit with --no-verify (CI still checks)");
    process.exitCode = 1;
  }
}

/**
 * Runs a package's bin from the repo's node_modules. Returns true when it passed or isn't installed.
 * @param {string} pkg
 * @param {string} bin
 * @param {string[]} args
 */
function run(pkg, bin, args) {
  const require = createRequire(join(root, "package.json"));
  let manifestPath;
  try {
    manifestPath = require.resolve(`${pkg}/package.json`);
  } catch {
    // The repo doesn't use this tool (CE has no Prettier or ESLint), so there's nothing to run.
    return true;
  }
  /** @type {{ bin?: string | Record<string, string> }} */
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[bin];
  if (!entry) return true;
  return runScript(join(dirname(manifestPath), entry), args);
}

/**
 * @param {string} script
 * @param {string[]} args
 */
function runScript(script, args) {
  return (
    spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: "inherit" }).status === 0
  );
}
