# Ticket 009: Add CI/CD Pipeline

**Priority:** Low
**Severity:** P3
**Estimated Effort:** 0.5–1 day

---

## Description

The project has no CI/CD. There is no automated testing, linting, or deployment on push. Adding a GitHub Actions workflow ensures code quality is maintained and provides a path to automated deployment.

### Scope
- Create `.github/workflows/ci.yml`
- Run linting and tests on every push and PR
- Add a deployment step (GitHub Pages recommended for a static app)
- Configure branch protection rules (require CI to pass before merging)

---

## Expected Outcome

- CI pipeline runs on every push and pull request
- Pipeline includes: install deps, lint, test, build
- Successful main branch builds deploy to GitHub Pages automatically
- README includes CI/deployment badges

---

## Concerns

1. Google Maps API key must not be exposed in CI logs. Use GitHub Secrets to inject the key at build time.
2. GitHub Pages deployment requires the app to work with a base path (`/GoogleMapsRoute/`), not just `/`. The Google Maps script URL and asset paths must be base-path-aware.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API key leakage in CI logs | Low | High | Use GitHub Secrets; never echo or print the key |
| GitHub Pages base path breaks asset loading | Medium | Medium | Use relative paths or configure Vite base path |
| CI runs too slowly with large test suite | Low | Low | Keep tests fast; use caching for node_modules |

---

## Dependencies

- **Blocks:** None
- **Blocked by:** Ticket 002 (build system), Ticket 007 (test suite)

---

## Related Tickets

- Ticket 002: Add build system
- Ticket 003: Externalize API key
- Ticket 007: Add test suite
