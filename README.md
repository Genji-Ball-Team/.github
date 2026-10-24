# Genji-Ball-Team/.github

Team-wide files for every Genji-Ball-Team repo:

- [STYLE.md](STYLE.md): the coding style for TypeScript, Rust and OverPy.
- [CONTRIBUTING.md](CONTRIBUTING.md): shown as the contributing guide in every repo of the org.
- `@genji-ball-team/style`: the shared ESLint and Prettier config, the file-size check and the pre-commit hook, published to npm from this repo.

## Using the package

```sh
npm install --save-dev @genji-ball-team/style eslint prettier typescript
```

`package.json`:

```json
{
  "prettier": "@genji-ball-team/style/prettier",
  "scripts": {
    "prepare": "gb-hooks install",
    "lint": "prettier --check . && eslint . && gb-size"
  }
}
```

`eslint.config.js` at the repo root, next to the `tsconfig.json`:

```js
import { styleConfig } from "@genji-ball-team/style/eslint";

export default styleConfig({ root: import.meta.dirname, ignores: ["dist/"] });
```

- **`gb-size`** checks the tracked Rust and OverPy files against the size limit (ESLint `max-lines` covers TS and JS). In Rust, a file's `#[cfg(test)]` part counts against the test limit.
- **`.size-exceptions`** at the repo root lists the files already over the limit, one path per line, each with its split issue in a `#` comment. Both ESLint and `gb-size` read it, and `gb-size` fails when a listed file is gone or under the limit, so the list only shrinks.
- **`gb-hooks install`** writes the pre-commit hook (it leaves an existing hook of someone else's alone, and does nothing in CI). The hook runs Prettier, ESLint and `gb-size` on the staged files, each only if the repo has it. `git commit --no-verify` skips it once.
- **Rust:** copy [`rust/clippy.toml`](rust/clippy.toml) next to `Cargo.toml`, and paste [`rust/lints.toml`](rust/lints.toml) into it.
- **OverPy (CE):** only `gb-size` and the hook; leave out ESLint, Prettier and TypeScript.

## Working on it

```sh
npm ci
npm run check   # typecheck (tsc on the JS), Prettier, ESLint, size check, node --test
```

The package is plain JavaScript with JSDoc types, so ESLint and Node load it without a build.

## Make a release

1. Bump `version` in `package.json` in its PR (a rule that fails more code is a major version).
2. After the merge, tag the merge commit and push the tag: `git tag v1.0.0 && git push origin v1.0.0`. The Release workflow checks and publishes it to npm.
3. Write the GitHub release notes by hand: `gh release create v1.0.0 --notes-file <notes>`. Say what changed and what repos must change.
