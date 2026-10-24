/** File-size limits from STYLE.md, in lines that aren't blank or comments. Test code gets double. */
export const limits = {
  code: { warn: 400, fail: 600 },
  test: { warn: 800, fail: 1200 },
};

/** Globs for test files, shared with the ESLint config so both checks agree. */
export const testGlobs = ["**/*.test.*", "**/*.spec.*", "**/test/**", "**/tests/**"];

/**
 * Comment syntax per extension. Every language here also has C-style block comments.
 * @type {Record<string, string>}
 */
const lineComment = {
  ".rs": "//",
  ".opy": "#",
  ".ts": "//",
  ".tsx": "//",
  ".js": "//",
  ".mjs": "//",
  ".cjs": "//",
};

/** Extensions the size script checks by itself. TS and JS are checked by ESLint `max-lines`. */
export const scannedExtensions = [".rs", ".opy"];

/**
 * The extension of a path, or "" without one.
 * @param {string} path
 */
export function extensionOf(path) {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") ? path.slice(dot) : "";
}

/**
 * Whether the size script can count lines in this file.
 * @param {string} path
 */
export function isCountable(path) {
  return extensionOf(path) in lineComment;
}

/**
 * Whether a path is a test file (same rules as `testGlobs`).
 * @param {string} path forward-slash path relative to the repo root
 */
export function isTestFile(path) {
  return /(^|\/)tests?\//.test(path) || /\.(test|spec)\.[^/]+$/.test(path);
}

/**
 * Counts the lines that aren't blank or comments, split into code and test lines. In Rust, everything
 * from a top-level `#[cfg(test)]` on is test code, since unit tests live at the bottom of the file.
 * @param {string} text
 * @param {string} extension one of the countable extensions, like ".rs"
 * @returns {{ code: number, test: number }}
 */
export function countLines(text, extension) {
  const marker = lineComment[extension] ?? "//";
  const counts = { code: 0, test: 0 };
  let inBlock = false;
  let inTests = false;
  for (const raw of text.split(/\r?\n/)) {
    if (extension === ".rs" && raw.startsWith("#[cfg(test)]")) inTests = true;
    let line = raw.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      inBlock = false;
      line = line.slice(end + 2).trim();
    }
    if (line.startsWith("/*")) {
      const end = line.indexOf("*/", 2);
      if (end === -1) {
        inBlock = true;
        continue;
      }
      line = line.slice(end + 2).trim();
    }
    // OverPy directives (`#!define`, `#!include`) start like a comment but are code.
    const isComment = line.startsWith(marker) && !line.startsWith("#!");
    if (line === "" || isComment) continue;
    counts[inTests ? "test" : "code"] += 1;
  }
  return counts;
}

/**
 * @typedef {"ok" | "warn" | "fail"} Level
 * @typedef {{ path: string, lines: number, limit: number, level: Level }} SizeResult
 */

/**
 * Checks one file against the limits. A Rust file's test part is checked on its own, against the test
 * limits, and the worse of the two parts is returned.
 * @param {string} path forward-slash path relative to the repo root
 * @param {string} text the file's contents
 * @returns {SizeResult}
 */
export function checkSize(path, text) {
  const counts = countLines(text, extensionOf(path));
  const parts = isTestFile(path)
    ? [{ lines: counts.code + counts.test, kind: limits.test }]
    : [
        { lines: counts.code, kind: limits.code },
        { lines: counts.test, kind: limits.test },
      ];
  /** @type {SizeResult} */
  let worst = { path, lines: counts.code, limit: limits.code.warn, level: "ok" };
  for (const { lines, kind } of parts) {
    if (lines > kind.fail) return { path, lines, limit: kind.fail, level: "fail" };
    if (lines > kind.warn && worst.level === "ok") {
      worst = { path, lines, limit: kind.warn, level: "warn" };
    }
  }
  return worst;
}

/**
 * Reads a `.size-exceptions` file: one path per line, `#` starts a comment.
 * @param {string} text
 * @returns {string[]}
 */
export function parseExceptions(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter((line) => line !== "");
}
