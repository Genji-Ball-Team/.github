# Genji-Ball-Team/.github

Team-wide files: the coding style ([STYLE.md](STYLE.md)), the contributing guide GitHub shows in every repo, and the shared config package `@genji-ball-team/style` (see the README for how repos use it).

- A rule changes here first, in its own PR, then the repos follow. Say in the PR which repos need a follow-up.
- Keep STYLE.md short: a rule and its reason, no tutorials.
- A rule in STYLE.md that lint can check goes into `eslint.js` (or `gb-size`, or `rust/`) in the same PR, with a case in the tests.
- The package is plain JavaScript with JSDoc types, checked by `tsc`. No build step.
- `npm run check` passes before a change is done (typecheck, Prettier, ESLint, size check, `node --test`). CI runs it on every PR.
- Releases: bump `version`, merge, push a `v<version>` tag. The Release workflow publishes to npm (with the `NPM_TOKEN` secret until trusted publishing, #2). Release notes are written by hand.
- Commits are made as `GenjiBallTeam`.
