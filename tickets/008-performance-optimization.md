# Ticket 008: Performance Optimization for Large Vehicle Counts

**Priority:** Medium
**Severity:** P3
**Estimated Effort:** 1–2 days

---

## Description

The application supports up to 100 cars + 100 planes simultaneously. With the current architecture — each vehicle has its own Canvas overlay, the animation loop iterates over every vehicle every tick, and the camera recalculates bounds on every frame — performance degrades significantly at scale.

### Performance Hotspots

| Area | Current Behavior | Issue |
|---|---|---|
| Animation loop | `setInterval` at 50ms, iterates all vehicles | Blocks main thread at scale |
| Canvas overlays | One `<canvas>` per vehicle | 200 DOM elements for 200 vehicles |
| Camera bounds | Recalculated every tick for all vehicles | O(n) per frame |
| Directions API | Sequential throttled requests | Slow initial load |

### Scope
- Profile current performance with 20, 50, and 100 vehicles
- Identify and optimize the main bottleneck
- Consider batching: single Canvas for all sprites, or requestAnimationFrame instead of setInterval
- Reduce camera recalculation frequency (e.g., every 10 ticks instead of every tick)

---

## Expected Outcome

- Smooth animation at 50+ vehicles (60fps target)
- No UI jank or dropped frames at 100 vehicles
- Documented performance baseline and improvements
- Optional: add a "performance mode" toggle that reduces visual fidelity for more vehicles

---

## Concerns

1. The camera auto-zoom is a core feature — reducing its update frequency makes the camera feel "laggy." Find the right balance.
2. Batching all sprites into a single Canvas loses per-sprite DOM event handling, but the current code doesn't use sprite events anyway — so this is viable.
3. `requestAnimationFrame` vs `setInterval`: `setInterval` is used to control animation speed independently of display refresh. Switching to rAF requires decoupling simulation time from wall-clock time.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Optimization changes break animation timing | Medium | High | Keep animation tick rate as configurable; test at all speed settings |
| Batching introduces visual artifacts | Low | Medium | Compare pixel-by-pixel with reference rendering |
| Premature optimization — performance may be fine on modern hardware | Medium | Low | Profile first; only optimize proven bottlenecks |

---

## Dependencies

- **Blocks:** None
- **Blocked by:** Ticket 001 (API migration), Ticket 006 (Canvas compatibility)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3
- Ticket 006: Fix Canvas overlay compatibility
- Ticket 007: Add test suite (add performance regression tests)
