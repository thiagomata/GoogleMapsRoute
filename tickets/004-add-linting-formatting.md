# Ticket 004: Add Linting and Code Formatting

**Priority:** Medium
**Severity:** P2
**Estimated Effort:** 0.5 day

---

## Description

The project has no linting or formatting configuration. Code uses mixed styles (tabs, spaces, varied naming conventions). Adding ESLint + Prettier enforces consistent style and catches common errors.

### Scope
- Add ESLint with recommended config
- Add Prettier with sensible defaults
- Add `npm run lint` and `npm run format` scripts
- Add pre-commit hook (via Husky + lint-staged) to auto-format on commit
- Create `.eslintrc` and `.prettierrc` config files

---

## Expected Outcome

- `npm run lint` runs ESLint and reports issues
- `npm run format` runs Prettier and formats all JS/HTML files
- Pre-commit hook auto-formats staged files
- No lint errors on main branch after initial fix pass

---

## Concerns

1. The legacy codebase (`car.js` is ~1500 lines of ES3-style code) will likely generate hundreds of lint warnings on first run. Plan for an initial `git commit --amend` style bulk-fix pass.
2. ES3 patterns (var, no strict mode, global variables) may conflict with modern ESLint rules — config may need custom overrides.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Lint rules break on legacy ES3 patterns | High | Medium | Use `eslint-plugin-es` or custom overrides for legacy syntax |
| Formatting changes make git history noisy | Medium | Low | Use a single "format all" commit; ignore in future blame |
| Pre-commit hook slows down development | Low | Low | Keep lint-staged to changed files only |

---

## Dependencies

- **Blocks:** Ticket 007 (tests — same lint rules should apply to test code)
- **Blocked by:** Ticket 002 (needs npm/package.json)

---

## Related Tickets

- Ticket 002: Add build system
- Ticket 005: Modernize to ES6+ modules
- Ticket 007: Add test suite
