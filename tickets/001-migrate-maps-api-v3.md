# Ticket 001: Migrate from Google Maps API v2 to v3

**Priority:** Critical
**Severity:** P0 — Blocking
**Estimated Effort:** 2–3 days

---

## Description

The project uses Google Maps JavaScript API v2 (`v=2` in the script URL), shut down by Google in 2010. The entire application is non-functional. Every Google Maps API call across all JS files must be migrated to v3 equivalents.

### Affected Files
- `index.html` — Script tag URL, API key
- `car.js` — All map initialization, routing, animation logic (~1500 lines)
- `epoly.js` — GPolygon/GPolyline extension methods
- `elabel.js` — GOverlay-based HTML label overlay

### Key API Mappings

| API v2 | API v3 |
|---|---|
| `GMap2` | `google.maps.Map` |
| `GLatLng` | `google.maps.LatLng` |
| `GPolyline` | `google.maps.Polyline` |
| `GPolygon` | `google.maps.Polygon` |
| `GDirections` | `google.maps.DirectionsService` + `DirectionsRenderer` |
| `GClientGeocoder` | `google.maps.Geocoder` |
| `GMarker` | `google.maps.Marker` |
| `GOverlay` | `google.maps.OverlayView` |
| `GEvent.bind` / `GEvent.addListener` | `google.maps.event.addListener` |
| `GBounds` | `google.maps.LatLngBounds` |

---

## Expected Outcome

- All four files (`index.html`, `car.js`, `epoly.js`, `elabel.js`) use Google Maps JS API v3
- Map renders and loads without errors
- Vehicle animation, routing, and camera-following work as before
- Zero console errors referencing v2 classes

---

## Concerns

1. `GDirections` in v2 returned step-by-step route data used extensively for animation interpolation. The v3 `DirectionsService` response shape is different — step parsing logic needs a full rewrite.
2. `ELabel` uses the v2 overlay system. Will need a v3 custom overlay replacement or a library like `MarkerWithLabel`.
3. `epoly.js` methods (`Distance()`, `Bearing()`, `GetPointAtDistance()`) are prototype extensions on v2 classes. These become standalone utility functions accepting v3 objects.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Directions API response format breaks route parsing | High | High | Audit all v2 response fields; test against v3 responses immediately |
| Overlay replacement breaks sprite positioning | Medium | Medium | Use proven v3 overlay library; test extensively |
| Scope creep into full rewrite | High | High | Strict 1:1 behavior migration; defer refactoring to separate tickets |
| API key billing/quota changes | Medium | Medium | Ensure key has Maps JS + Directions + Geocoding APIs enabled |

---

## Dependencies

- **Blocks:** Tickets 002–009
- **Blocked by:** None

---

## Related Tickets

- Ticket 003: Externalize API key
- Ticket 005: Modernize to ES6+ modules
- Ticket 006: Fix Canvas overlay for modern browsers
