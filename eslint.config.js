import { styleConfig } from "./eslint.js";

export default [
  ...styleConfig({ root: import.meta.dirname, ignores: ["test/fixtures/"] }),
  { files: ["prettier.js"], rules: { "import-x/no-default-export": "off" } },
  // This repo is JS checked by tsc (checkJs), which already catches undefined names.
  { files: ["**/*.js"], rules: { "no-undef": "off" } },
];
