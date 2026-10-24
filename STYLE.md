# Genji Ball coding style

One style for every Genji-Ball-Team repo: TypeScript (website, host tool, bot, UI library), Rust (host tool) and OverPy (game). Each repo's `AGENTS.md` links here. The lint and format config ships as `@genji-ball-team/style` from this repo, so the repos can't drift apart.

When a rule and the surrounding code disagree, follow the rule in new code and fix the old code when you touch it, not in one big sweep.

## Tools

- **TypeScript:** Prettier formats, ESLint lints (typescript-eslint, including the type-aware rules such as `no-floating-promises`). Both run in `npm run check` and CI.
- **Prettier:** the defaults plus `printWidth: 100`: double quotes, semicolons, trailing commas, 2-space indent.
- **Rust:** `cargo fmt` and `clippy`.
- **OverPy:** no formatter, written conventions only (see [OverPy](#overpy)).
- **Pre-commit hook:** runs Prettier, ESLint and the file-size check on staged files, as an early warning. CI is the real gate; never rely on the hook alone.

## File size

No monoliths.

- A file warns at **400 lines** and fails at **600**, not counting blank lines and comments. Test files get double (800 / 1200).
- Enforced in `npm run check`: ESLint `max-lines` for TS/JS, the shared size script for Rust and OverPy.
- Files already over the limit are on the repo's known-exceptions list, each with an issue to split it. The list only shrinks; nothing new goes on it.

## Naming

- **Files:** kebab-case (`player-store.ts`, `ranked-log.opy`). Rust files are snake_case, because the compiler requires it.
- **Code:** `camelCase` values and functions, `PascalCase` types and classes, `SCREAMING_SNAKE_CASE` only for environment and wrangler vars. Enforced with ESLint `naming-convention`.

## Comments

- Explain **why**, not what. Each exported function or type gets a short doc comment: what it's for and anything surprising.
- Inside a function, comment only what the code can't say: a log-spec rule, a free-tier limit, a workaround with its issue number.
- Cut comments that repeat the code.

## Functions

- Lint warns over about 60 lines per function, nesting deeper than 3 levels, or more than 4 parameters (pass an object instead). Rust: clippy `too_many_lines` and `cognitive_complexity`.
- These warn rather than fail: a long `switch` over log line types can be the clearest code. File size is the hard limit.

## Modules

- Named exports only, no `export default`. No barrel files (an `index.ts` that only re-exports). No circular imports (`import/no-cycle`).
- Pure logic (parsing, ratings, models, formatting) lives in its own modules with no D1, `fetch`, DOM or Discord calls. Those stay in thin handler, store and view files.

## Types

- **Check data at the edges.** Request bodies, D1 rows, log files, Discord payloads and `localStorage` go through a small parser that returns a real type. No schema library.
- **No escape hatches inside.** Lint bans `any` and the non-null `!`. `as` is allowed only in edge parsers, or with a comment saying why.

## Errors

- Expected failures (a bad upload, a missing file, Discord down, an invalid log line) are handled where they happen: a clear error answer, a toast, or a line through the repo's logger.
- `throw` (or `panic` in Rust) is only for bugs that can't happen.
- Every `catch` handles the error or rethrows it with context. An empty or log-and-forget `catch` fails review.
- Rust: `unwrap` and `expect` only in tests and at startup (clippy `unwrap_used`).
- Error text a user sees follows the brand voice: what happened, and what to do.

## Tests

- A test protects behaviour someone relies on. A bug fix comes with a test that fails without the fix; a new behaviour comes with a test.
- Test from the outside (input in, answer out, D1 state after), not internals, so refactors and file splits don't break tests.
- Real fixtures over mocks: the log spec's example log, a local D1, recorded Discord payloads.
- No coverage percentage target.
- No bloat:
  - Removing something removes its tests. Never add a test that checks a removed thing is gone.
  - No tests of trivial code, constants, the framework, or what the type checker already guarantees.
  - One test per behaviour; many inputs go in one table-driven test.
  - When a change breaks a test, update that test instead of adding another beside it.

## Commits and branches

- The PR title is the commit: an imperative sentence saying what changes, with an optional area prefix (`Docs:`, `Backend:`). Squash merge, one commit per PR.
- Branches: short kebab-case topic names (`tier-colours`, `split-server-rs`).
- Release notes are written by hand.

## OverPy

CE's style is established and its own. Only what makes sense there applies:

- Match the surrounding code, `camelCase` for new names, named constants from `src/config/constants.opy` instead of magic numbers.
- Kebab-case files, the file-size limit, and comments that explain why.
- Not applied: types, error handling, Prettier and ESLint.
