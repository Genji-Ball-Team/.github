import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { ESLint } from "eslint";
import { styleConfig } from "../eslint.js";

const filler = (/** @type {number} */ count) =>
  Array.from({ length: count }, (_, i) => `export const v${i} = ${i};`).join("\n");

/** Each file, and the rules it should break (as "rule-id:severity"). */
const files = {
  "src/clean.ts": {
    text: "/** Adds. */\nexport const add = (a: number, b: number) => a + b;\n",
    rules: [],
  },
  "src/default.ts": { text: "export default 1;\n", rules: ["import-x/no-default-export:2"] },
  "src/any.ts": {
    text: "export const a: any = 1;\n",
    rules: ["@typescript-eslint/no-explicit-any:2"],
  },
  "src/bang.ts": {
    text: "export const f = (m: Map<string, number>) => m.get('a')!;\n",
    rules: ["@typescript-eslint/no-non-null-assertion:2"],
  },
  "src/promise.ts": {
    text: "const go = () => Promise.resolve(1);\nexport const run = () => {\n  go();\n};\n",
    rules: ["@typescript-eslint/no-floating-promises:2"],
  },
  "src/names.ts": {
    text: "export const Bad_name = 1;\nexport type lower = string;\nexport const ok = { snake_case: 1 };\n",
    rules: ["@typescript-eslint/naming-convention:2", "@typescript-eslint/naming-convention:2"],
  },
  "src/cycle-a.ts": {
    text: "import { b } from './cycle-b.js';\nexport const a = () => b;\n",
    rules: ["import-x/no-cycle:2"],
  },
  "src/cycle-b.ts": {
    text: "import { a } from './cycle-a.js';\nexport const b = () => a;\n",
    rules: ["import-x/no-cycle:2"],
  },
  "src/long.ts": { text: filler(450), rules: ["gb/max-lines:1"] },
  "src/huge.ts": { text: filler(650), rules: ["gb/max-lines:1", "max-lines:2"] },
  "src/listed.ts": { text: filler(650), rules: ["gb/max-lines:1"] },
  "test/long.test.ts": { text: filler(650), rules: [] },
  "vite.config.ts": { text: "export default {};\n", rules: [] },
  "src/plain.js": { text: "export const f = () => 1;\n", rules: [] },
};

const root = mkdtempSync(join(tmpdir(), "gb-eslint-"));
after(() => rmSync(root, { recursive: true, force: true }));
writeFileSync(join(root, ".size-exceptions"), "src/listed.ts\n");
writeFileSync(
  join(root, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: { strict: true, module: "nodenext", noEmit: true, allowJs: true },
    include: ["src", "test", "*.ts"],
  }),
);
for (const [path, { text }] of Object.entries(files)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

test("the config flags what STYLE.md bans, and only that", async () => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: styleConfig({ root }),
  });
  const results = await eslint.lintFiles(["."]);
  for (const [path, { rules }] of Object.entries(files)) {
    const result = results.find((r) => r.filePath === join(root, path));
    assert.ok(result, `${path} was linted`);
    const found = result.messages.map((m) => `${m.ruleId}:${m.severity}`).sort();
    assert.deepEqual(found, [...rules].sort(), `${path}: ${JSON.stringify(result.messages)}`);
  }
});
