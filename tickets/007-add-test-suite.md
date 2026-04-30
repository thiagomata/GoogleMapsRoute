# Ticket 007: Add Test Suite

**Priority:** Medium
**Severity:** P2
**Estimated Effort:** 2–3 days

---

## Description

The project has zero tests. The animation logic, route parsing, distance calculations, and sprite rotation code are unverified. Adding tests prevents regressions during the migration and modernization effort.

### Scope
- Choose a test framework (Jest or Vitest recommended)
- Add unit tests for pure logic functions
- Add integration tests for API interactions (mocked)
- Add visual/snapshot tests for sprite rendering if feasible

### Priority Test Targets
1. **`epoly.js` utility functions** — `Distance()`, `Bearing()`, `GetPointAtDistance()` (pure math, easiest to test)
2. **`VehicleImage`** — sprite loading, direction selection, rotation calculation
3. **`Animation.moveCar()` / `Animation.movePlane()`** — position interpolation along polylines
4. **Camera logic** — bounding box calculation, auto-zoom decisions
5. **Directions API response parsing** — v2-to-v3 response mapping

---

## Expected Outcome

- Test framework configured with `npm test`
- Unit tests for all pure logic functions
- Test coverage report (target: 70%+ for core logic)
- Tests run in CI (GitHub Actions recommended)

---

## Concerns

1. The animation loop (`Animation.run()` / `Animation.draw()`) uses `setInterval` and tight coupling to the Google Map instance — it is difficult to unit test. Consider extracting pure functions (position calculation, bearing calculation) for testability.
2. Testing Google Maps API interactions requires mocking. Use `jest.mock` or equivalent to stub `google.maps.*` calls.
3. Visual testing (does the sprite look correct?) is inherently hard to automate. Consider manual visual QA checklist as a stopgap.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Animation code is too coupled to test | High | Medium | Extract pure functions; test those first |
| Mocking Google Maps API is fragile | Medium | Medium | Use well-maintained mock library or create thin wrapper |
| Tests give false confidence without visual QA | Medium | Medium | Maintain a manual visual checklist alongside automated tests |

---

## Dependencies

- **Blocks:** None
- **Blocked by:** Ticket 002 (build system), Ticket 004 (linting)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3
- Ticket 002: Add build system
- Ticket 004: Add linting and formatting
- Ticket 009: Add CI/CD pipeline
