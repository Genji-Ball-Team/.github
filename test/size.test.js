import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSize, countLines, isTestFile, parseExceptions } from "../lib/size.js";

/** @param {number} count @param {string} line */
const lines = (count, line = "let x = 1;") => Array.from({ length: count }, () => line).join("\n");

test("countLines skips blanks and comments", () => {
  const cases = [
    { ext: ".rs", text: "fn a() {}\n\n// note\n  /// doc\nfn b() {}", code: 2, testLines: 0 },
    { ext: ".rs", text: "/* one\n two */\nfn a() {}\n/* x */ fn b() {}", code: 2, testLines: 0 },
    { ext: ".rs", text: "fn a() {}\n#[cfg(test)]\nmod tests {\n}", code: 1, testLines: 3 },
    { ext: ".rs", text: "fn a() {\n    #[cfg(test)]\n    x();\n}", code: 4, testLines: 0 },
    {
      ext: ".opy",
      text: 'rule "A":\n    # why\n\n#!define X 1\n    wait()',
      code: 3,
      testLines: 0,
    },
    { ext: ".ts", text: "const a = 1;\n// b\n/**\n * c\n */\nconst d = 2;", code: 2, testLines: 0 },
  ];
  for (const { ext, text, code, testLines } of cases) {
    assert.deepEqual(countLines(text, ext), { code, test: testLines }, `${ext}: ${text}`);
  }
});

test("isTestFile matches test folders and .test files", () => {
  const cases = [
    ["src-tauri/tests/upload.rs", true],
    ["test/parser.test.ts", true],
    ["src/parser.spec.ts", true],
    ["src/test-data.rs", false],
    ["src/contest/rules.opy", false],
  ];
  for (const [path, expected] of cases)
    assert.equal(isTestFile(String(path)), expected, String(path));
});

test("checkSize warns over 400, fails over 600, double for tests", () => {
  const cases = [
    { path: "src/a.rs", text: lines(400), level: "ok" },
    { path: "src/a.rs", text: lines(401), level: "warn" },
    { path: "src/a.rs", text: lines(601), level: "fail" },
    { path: "tests/a.rs", text: lines(1000), level: "warn" },
    { path: "tests/a.rs", text: lines(1201), level: "fail" },
    { path: "src/a.rs", text: `${lines(300)}\n#[cfg(test)]\n${lines(900)}`, level: "warn" },
    { path: "src/a.rs", text: `${lines(300)}\n#[cfg(test)]\n${lines(1300)}`, level: "fail" },
    { path: "src/a.opy", text: lines(700, "# comment"), level: "ok" },
  ];
  for (const { path, text, level } of cases) {
    assert.equal(checkSize(path, text).level, level, `${path}, ${text.split("\n").length} lines`);
  }
});

test("parseExceptions reads paths and drops comments", () => {
  const text = "# split in #12\nsrc-tauri/src/server.rs  # #13\n\n  src/main.ts\r\n";
  assert.deepEqual(parseExceptions(text), ["src-tauri/src/server.rs", "src/main.ts"]);
});
