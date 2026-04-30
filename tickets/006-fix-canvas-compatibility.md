# Ticket 006: Fix Canvas Overlay Compatibility with Modern Browsers

**Priority:** Medium
**Severity:** P2
**Estimated Effort:** 1 day

---

## Description

The project uses HTML5 Canvas elements embedded in map overlays via `ELabel` to render vehicle sprites. This approach was experimental in 2012 and may not work correctly in modern browsers due to changes in Canvas APIs, CSS rendering, and Google Maps overlay rendering pipeline.

### Specific Issues to Audit
- Canvas `drawImage()` calls with 8-directional sprites
- Canvas rotation via `ctx.setTransform()` / `ctx.rotate()`
- `ELabel` positioning overlay on modern Google Maps DOM structure
- Canvas size (32x32) scaling on high-DPI (Retina) displays
- Potential CORS issues loading local image files into Canvas

---

## Expected Outcome

- Vehicle sprites render correctly on Chrome, Firefox, Safari, and Edge
- Sprites rotate and change direction properly
- Sprites display correctly on Retina/high-DPI screens
- No Canvas security errors (tainted canvas) in console

---

## Concerns

1. If `ELabel` is replaced during the v3 migration (Ticket 001), the Canvas overlay approach may need a completely different implementation — possibly using custom SVG markers or Google Maps `Marker` with canvas-generated data URLs.
2. High-DPI support requires `canvas.width` / `canvas.height` to be 2x the display size with CSS scaling. This was not accounted for in the original code.
3. Local image loading into Canvas can trigger tainted canvas errors if not served from the same origin.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Canvas overlay approach not viable on v3 | Medium | High | Fallback to SVG markers or pre-rotated PNG sprites |
| High-DPI scaling breaks sprite rendering | Medium | Medium | Test on Retina display early; add `devicePixelRatio` scaling |
| CORS errors block canvas rendering | Low | High | Serve all assets from same origin; avoid cross-origin image loads |

---

## Dependencies

- **Blocks:** Ticket 008 (Performance optimization — rendering is the bottleneck)
- **Blocked by:** Ticket 001 (API migration), Ticket 002 (build system for asset handling)

---

## Related Tickets

- Ticket 001: Migrate to Maps API v3
- Ticket 008: Performance optimization for large vehicle counts
