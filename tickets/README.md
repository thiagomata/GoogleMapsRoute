# Tickets

Project: GoogleMapsRoute — "Traveling in Google Maps"

Tickets are ordered by severity/priority (P0 first).

---

## Ticket List

| # | Ticket | Priority | Severity | Effort | Status |
|---|---|---|---|---|---|
| 001 | [Migrate from Google Maps API v2 to v3](./001-migrate-maps-api-v3.md) | Critical | P0 — Blocking | 2–3 days | Pending |
| 002 | [Add Build System and Package Management](./002-add-build-system.md) | High | P1 | 1 day | Pending |
| 003 | [Externalize API Key via Environment Variables](./003-externalize-api-key.md) | High | P1 — Security | 0.5 day | Pending |
| 004 | [Add Linting and Code Formatting](./004-add-linting-formatting.md) | Medium | P2 | 0.5 day | Pending |
| 005 | [Modernize JavaScript to ES6+ Modules](./005-modernize-es6-modules.md) | Medium | P2 | 1–2 days | Pending |
| 006 | [Fix Canvas Overlay Compatibility with Modern Browsers](./006-fix-canvas-compatibility.md) | Medium | P2 | 1 day | Pending |
| 007 | [Add Test Suite](./007-add-test-suite.md) | Medium | P2 | 2–3 days | Pending |
| 008 | [Performance Optimization for Large Vehicle Counts](./008-performance-optimization.md) | Medium | P3 | 1–2 days | Pending |
| 009 | [Add CI/CD Pipeline](./009-add-ci-cd.md) | Low | P3 | 0.5–1 day | Pending |
| 010 | [Handle Quota Exhaustion + "Bring Your Own Key"](./010-handle-quota-exhaustion-byok.md) | Medium | P2 | 1 day | Pending |

---

## Suggested Execution Order

```
Phase 1 — Make it work
├── 003: Externalize API key (quick win, security)
├── 001: Migrate to Maps API v3 (the big one, everything else depends on it)
└── 002: Add build system (enables modern tooling)

Phase 2 — Make it right
├── 004: Add linting and formatting
├── 005: Modernize to ES6+ modules
├── 006: Fix Canvas overlay compatibility
└── 007: Add test suite

Phase 3 — Make it fast and safe
├── 008: Performance optimization
└── 009: Add CI/CD pipeline
```

---

## Dependency Graph

```
003 ─┐
     ├──→ 001 ──→ 005 ─┐
     └──────┘          │
                       ├──→ 007 ──→ 009
002 ──→ 004 ───────────┘    ↑
     └──────────────────────┘
001 ──→ 006 ──→ 008
```
