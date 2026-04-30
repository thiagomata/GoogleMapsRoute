# Ticket 005: Modernize JavaScript to ES6+ Modules

**Priority:** Medium
**Severity:** P2
**Estimated Effort:** 1–2 days

---

## Description

All JavaScript is written in ES3/ES5 style: `var` declarations, prototype-based inheritance, callback-based async, global namespace pollution, and manual script ordering. Modernizing to ES6+ improves readability, maintainability, and enables better tooling.

### Scope
- Replace `var` with `const`/`let`
- Convert prototype-based classes to `class` syntax
- Replace callback patterns with Promises / async-await where applicable
- Convert global namespace to ES module imports/exports
- Use arrow functions consistently
- Add `use strict` (or ensure modules are strict by default)

---

## Expected Outcome

- `car.js`, `epoly.js`, `elabel.js` use ES6+ syntax
- All dependencies expressed via `import`/`export` (not script order)
- No global namespace pollution
- Application behavior unchanged

---

## Concerns

1. `car.js` uses complex prototype chains and cross-file dependencies (`ELabel`, `Vehicle`, `Animation`, `FlightPlan`). Converting to classes is straightforward but requires careful attention to `this` binding in callbacks and event handlers.
2. The Google Maps v2 callback-based APIs (`GEvent.bind`, `GDirections.load`) will eventually be replaced with v3 event listeners anyway — consider doing this modernization as part of Ticket 001 rather than separately.
3. Canvas rendering code in `VehicleImage` uses old-style `new Image()` patterns that can stay as-is.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `this` binding breaks in event handlers | High | High | Use arrow functions or `.bind()` consistently during conversion |
| Partial modernization creates inconsistent codebase | Medium | Medium | Do this as a single pass across all files |
| Overlapping changes with Ticket 001 (API migration) | High | Medium | Coordinate scope — ideally do after API migration to avoid double-churn |

---

## Dependencies

- **Blocks:** None
- **Blocked by:** Ticket 001 (API migration should come first to avoid double-churn), Ticket 002 (build system)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3
- Ticket 002: Add build system
- Ticket 004: Add linting and formatting
- Ticket 007: Add test suite
