import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const bin = join(dirname(fileURLToPath(import.meta.url)), "..", "bin");
const dirs = /** @type {string[]} */ ([]);
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/**
 * A fresh git repo holding the given files.
 * @param {Record<string, string>} files
 */
function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), "gb-style-"));
  dirs.push(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  execFileSync("git", ["add", "-A"], { cwd: dir });
  return dir;
}

/**
 * @param {string} dir
 * @param {string} script
 * @param {string[]} args
 */
function run(dir, script, args = []) {
  const env = { ...process.env, CI: "" };
  const result = spawnSync(process.execPath, [join(bin, script), ...args], { cwd: dir, env });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const big = Array.from({ length: 700 }, () => "let x = 1;").join("\n");
const small = "fn a() {}\n";

test("gb-size fails big files and keeps the exceptions list honest", () => {
  /** @type {{ name: string, files: Record<string, string>, status: number, says: string }[]} */
  const cases = [
    { name: "small files pass", files: { "src/a.rs": small }, status: 0, says: "" },
    {
      name: "a big file fails",
      files: { "src/a.rs": big },
      status: 1,
      says: "src/a.rs: 700 lines",
    },
    {
      name: "a listed big file passes",
      files: { "src/a.rs": big, ".size-exceptions": "src/a.rs # split in #3\n" },
      status: 0,
      says: "",
    },
    {
      name: "a listed file under the limit fails",
      files: { "src/a.rs": small, ".size-exceptions": "src/a.rs\n" },
      status: 1,
      says: "src/a.rs is under the limit now",
    },
    {
      name: "a listed file that's gone fails",
      files: { "src/a.rs": small, ".size-exceptions": "src/gone.rs\n" },
      status: 1,
      says: "src/gone.rs doesn't exist",
    },
    { name: "TS is left to ESLint", files: { "src/a.ts": big }, status: 0, says: "" },
  ];
  for (const { name, files, status, says } of cases) {
    const result = run(repo(files), "gb-size.js");
    assert.equal(result.status, status, `${name}: ${result.output}`);
    assert.ok(result.output.includes(says), `${name}: ${result.output}`);
  }
});

test("gb-hooks installs a pre-commit hook that runs the size check", () => {
  const dir = repo({ "src/a.rs": small });
  assert.equal(run(dir, "gb-hooks.js", ["install"]).status, 0);
  const hook = readFileSync(join(dir, ".git/hooks/pre-commit"), "utf8");
  assert.match(hook, /script=".*bin\/gb-hooks\.js"/);
  assert.match(hook, /exec node "\$script" pre-commit/);

  writeFileSync(join(dir, "src/a.rs"), big);
  execFileSync("git", ["add", "-A"], { cwd: dir });
  const result = run(dir, "gb-hooks.js", ["pre-commit"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /src\/a\.rs: 700 lines/);
});

test("gb-hooks leaves someone else's hook alone", () => {
  const dir = repo({ "src/a.rs": small });
  writeFileSync(join(dir, ".git/hooks/pre-commit"), "#!/bin/sh\necho mine\n");
  run(dir, "gb-hooks.js", ["install"]);
  assert.equal(readFileSync(join(dir, ".git/hooks/pre-commit"), "utf8"), "#!/bin/sh\necho mine\n");
});
