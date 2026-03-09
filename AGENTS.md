# Repository Working Rules

These rules apply to any automated/code-assistant commit work in this repository.

## Commit Message Rules

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Add scope by app/package when helpful, for example:
  - `feat(web): ...`
  - `fix(backend): ...`
  - `chore(repo): ...`

## Pre-PR Validation Rules

Before opening a PR, run all of the following:

- Lint
- Type checks
- Relevant tests

## PR Content Rules

Every PR should include:

- Notes for env/DB changes
