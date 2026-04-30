# Ticket 002: Add Build System and Package Management

**Priority:** High
**Severity:** P1
**Estimated Effort:** 1 day

---

## Description

The project has no `package.json`, no build tool, no bundler, and no dev server. All JS files are loaded via individual `<script>` tags in `index.html`. This makes dependency management, module imports, and local development painful.

### Scope
- Create `package.json` with project metadata and scripts
- Add a lightweight bundler (Vite recommended)
- Configure local dev server with hot reload
- Set up build output for production deployment

---

## Expected Outcome

- `npm install` installs all dependencies
- `npm run dev` starts a local dev server with hot reload
- `npm run build` produces a production-ready `dist/` folder
- JS files are converted to ES modules (or kept as globals but bundled)
- No changes to application behavior

---

## Concerns

1. The current codebase uses global variables and `<script>` tag ordering for dependencies. Converting to ES modules requires identifying and resolving all implicit dependencies between `car.js`, `epoly.js`, and `elabel.js`.
2. If migration to v3 (Ticket 001) is not yet done, the bundler must still correctly order the legacy script loads.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Module conversion breaks global variable access | Medium | High | Audit all global variable usage before conversion |
| Bundler config introduces build errors | Low | Medium | Start with minimal config; add features incrementally |
| Dev server CORS issues with Google Maps API | Low | Low | Use proxy config in Vite if needed |

---

## Dependencies

- **Blocks:** Ticket 004 (Add linting/formatting), Ticket 007 (Add tests)
- **Blocked by:** None (can be done in parallel with Ticket 001, but easier after)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3
- Ticket 004: Add linting and formatting
- Ticket 005: Modernize to ES6+ modules
- Ticket 007: Add test suite
