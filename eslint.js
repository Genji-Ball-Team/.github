import js from "@eslint/js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import { defineConfig } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";
import tseslint from "typescript-eslint";
import { readExceptions } from "./lib/repo.js";
import { limits, testGlobs } from "./lib/size.js";

/** Config files have to default-export, so they're the one place that may. */
const configFiles = ["**/*.config.{js,mjs,cjs,ts,mts,cts}"];
const jsFiles = ["**/*.{js,mjs,cjs}"];

/** `max-lines` only takes one limit, so the warning runs as a second copy of the same rule. */
const maxLines = builtinRules.get("max-lines");
if (!maxLines) throw new Error("ESLint has no max-lines rule");
const plugin = { rules: { "max-lines": maxLines } };

/** @param {number} max */
const lineLimit = (max) => ({ max, skipBlankLines: true, skipComments: true });

/**
 * The team's ESLint config (STYLE.md). Use it from the repo root's `eslint.config.js`:
 *
 *   import { styleConfig } from "@genji-ball-team/style/eslint";
 *   export default styleConfig({ root: import.meta.dirname, ignores: ["dist/"] });
 *
 * @param {{ root: string, ignores?: string[] }} options `root` holds the tsconfig and `.size-exceptions`
 */
export function styleConfig({ root, ignores = [] }) {
  const exceptions = readExceptions(root);
  return defineConfig(
    { ignores: ["**/node_modules/", "**/dist/", "**/coverage/", ...ignores] },
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: root } },
      plugins: { gb: plugin, "import-x": importX },
      settings: {
        // Without the parser and extensions, import-x can't read TS imports and misses cycles.
        ...importX.flatConfigs.typescript.settings,
        "import-x/resolver-next": [createTypeScriptImportResolver()],
      },
      rules: {
        "max-lines": ["error", lineLimit(limits.code.fail)],
        "gb/max-lines": ["warn", lineLimit(limits.code.warn)],
        "max-lines-per-function": ["warn", lineLimit(60)],
        "max-depth": ["warn", 3],
        "max-params": ["warn", 4],
        "@typescript-eslint/no-non-null-assertion": "error",
        "import-x/no-default-export": "error",
        "import-x/no-cycle": "error",
        "@typescript-eslint/naming-convention": [
          "error",
          { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
          { selector: "typeLike", format: ["PascalCase"] },
          { selector: "enumMember", format: ["PascalCase"] },
          // Data shapes follow their source (D1 columns, Discord payloads, env vars), so any case.
          { selector: ["property", "objectLiteralMethod"], format: null },
          { selector: "variable", modifiers: ["destructured"], format: null },
          { selector: "import", format: null },
        ],
      },
    },
    { files: jsFiles, extends: [tseslint.configs.disableTypeChecked] },
    { files: configFiles, rules: { "import-x/no-default-export": "off" } },
    {
      files: testGlobs,
      rules: {
        "max-lines": ["error", lineLimit(limits.test.fail)],
        "gb/max-lines": ["warn", lineLimit(limits.test.warn)],
        "max-lines-per-function": "off",
      },
    },
    exceptions.length > 0 ? { files: exceptions, rules: { "max-lines": "off" } } : {},
  );
}
