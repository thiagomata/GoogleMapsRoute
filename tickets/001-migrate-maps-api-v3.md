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

---

## Detailed Implementation Plan

### Approach: Layered migration with working state at each layer

Each layer is a separate commit. No layer breaks the app more than the previous one.

### Architecture — Current vs Target

```mermaid
graph TB
    subgraph "Current (v2 — Broken)"
        HTML_v2["index.html<br/>v2 script tag"] --> GMap2["GMap2"]
        GMap2 --> CarJS_v2["car.js<br/>Animation / Vehicle / FlightPlan"]
        CarJS_v2 --> GDirections_v2["GDirections<br/>loadFromWaypoints"]
        CarJS_v2 --> GPolyline_v2["GPolyline<br/>+ epoly.js extensions"]
        CarJS_v2 --> GOverlay_v2["ELabel extends GOverlay"]
        CarJS_v2 --> GClientGeo_v2["GClientGeocoder"]
        GDirections_v2 -.events.-> CarJS_v2
        GClientGeo_v2 -.callbacks.-> CarJS_v2
    end

    subgraph "Target (v3)"
        HTML_v3["index.html<br/>v3 script tag"] --> GMap_v3["google.maps.Map"]
        GMap_v3 --> CarJS_v3["car.js<br/>Animation / Vehicle / FlightPlan"]
        CarJS_v3 --> DirService_v3["DirectionsService.route()<br/>Promise-based callback"]
        CarJS_v3 --> Polyline_v3["google.maps.Polyline<br/>+ PolyUtil functions"]
        CarJS_v3 --> OverlayView_v3["ELabel extends OverlayView<br/>onAdd/draw/onRemove"]
        CarJS_v3 --> Geocoder_v3["google.maps.Geocoder<br/>geocode() callback"]
        DirService_v3 -.then/catch.-> CarJS_v3
        Geocoder_v3 -.callback.-> CarJS_v3
    end
```

### Vehicle Lifecycle — State Machine

```mermaid
stateDiagram-v2
    [*] --> Created: new Vehicle()
    Created --> LoadingRoute: initCheckPoints()
    Created --> LoadingGeo: FlightPlan (plane)

    LoadingRoute --> RouteReady: directions callback OK
    LoadingRoute --> Error: directions callback FAIL

    LoadingGeo --> GeoFromDone: geocode from OK
    GeoFromDone --> GeoToDone: geocode to OK
    GeoToDone --> RouteReady: build polyline
    LoadingGeo --> Error: geocode FAIL

    RouteReady --> Mounted: addVehicle() + addOverlay()
    Mounted --> Animating: animation.run()

    Animating --> Animating: moveCar() / movePlane()
    Animating --> Fading: distance >= endOfLine

    Fading --> Fading: opacity /= 2
    Fading --> Removed: opacity < 0.1

    Error --> [*]
    Removed --> [*]
```

---

### Layer 1: `index.html` — API script and map initialization

**What changes:**
- Replace `<script src="http://maps.google.com/maps?file=api&amp;v=2&amp;...">` with `<script src="https://maps.googleapis.com/maps/api/js?v=3&libraries=geometry&key=YOUR_KEY">`
- Remove `onunload="GUnload()"` from `<body>` (not needed in v3)
- Add map initialization options object (center, zoom, mapTypeId)

**Code mapping:**
```
// v2 (car.js:556-558)
this.objMap = new GMap2( document.getElementById( this.strIdMap ) );
this.objMap.addControl( new GMapTypeControl() );
this.objMap.setCenter( new GLatLng(0,0) , 2 );

// v3
this.objMap = new google.maps.Map( document.getElementById( this.strIdMap ), {
    center: { lat: 0, lng: 0 },
    zoom: 2,
    mapTypeId: google.maps.MapTypeId.ROADMAP
});
```

**Verification criteria:**
- Page loads with no console errors
- Map renders at the default center (0,0) zoom 2
- Pan and zoom work manually

---

### Layer 2: `epoly.js` → standalone geometry utilities

**What changes:**
- Convert all `GPolygon.prototype.*` and `GPolyline.prototype.*` methods to standalone functions
- Replace `GLatLng` with `google.maps.LatLng`
- Replace `point.distanceFrom(other)` with `google.maps.geometry.spherical.computeDistanceBetween(point, other)`
- Replace `getVertex(i)` / `getVertexCount()` with `path.getAt(i)` / `path.getLength()` where `path = polyline.getPath()`

**Methods to port:**
| v2 Method | v3 Signature |
|---|---|
| `poly.Distance()` | `polylineDistance(path)` |
| `poly.GetPointAtDistance(m)` | `getPointAtDistance(path, metres)` |
| `poly.GetIndexAtDistance(m)` | `getIndexAtDistance(path, metres)` |
| `poly.GetPointsAtDistance(m)` | `getPointsAtDistance(path, interval)` |
| `poly.Bearing(v1, v2)` | `bearingBetween(path, v1, v2)` |
| `poly.Contains(point)` | `polygonContains(path, point)` |
| `poly.Area()` | `polygonArea(path)` |
| `poly.Bounds()` | `polylineBounds(path)` |

**Design decision:** Wrap these in a `PolyUtil` namespace object rather than polluting globals. The utility functions accept `google.maps.MVCArray<LatLng>` (what `polyline.getPath()` returns).

**Verification criteria:**
- Create a test polyline with 3 known points
- `polylineDistance` returns correct total length
- `getPointAtDistance` returns correct interpolated point at halfway
- `bearingBetween` returns correct angle between first two vertices

---

### Layer 3: `elabel.js` → v3 `OverlayView`

**What changes:**
- Replace `GOverlay` inheritance with `google.maps.OverlayView`
- Replace `initialize(map)` with `onAdd()`, `draw()`, `onRemove()`
- Replace `map.getPane(G_MAP_FLOAT_SHADOW_PANE)` with `this.getPanes().overlayMouseTarget` (or similar pane)
- Replace `map.fromLatLngToDivPixel()` with `this.getProjection().fromLatLngToDivPixel()`
- Remove browser-specific opacity hacks (filter, KHTMLOpacity, MozOpacity) — modern CSS `opacity` works everywhere

**Architecture note:** If `OverlayView` proves too complex for this use case, the fallback is to use `google.maps.Marker` with a canvas-generated data URL as the icon. This is simpler but loses the live Canvas element (would need to regenerate data URL on each frame).

**Verification criteria:**
- A single ELabel with a `<canvas>` element appears at a known coordinate
- Canvas content renders correctly
- ELabel moves when its coordinate is updated via `setPoint()`
- ELabel is removed from DOM when `remove()` is called

---

### Layer 4: `Vehicle` — DirectionsService + Geocoder

**This is the hardest layer.** The entire routing and step-tracking logic changes.

**4a. Directions API call:**
```
// v2 (car.js:1164-1174)
this.objDirection = new GDirections();
this.objDirection.loadFromWaypoints([this.strFrom, this.strTo], {getPolyline:true, getSteps:true});
GEvent.addListener(this.objDirection, "load", this.onLoadCar.bind(this));
GEvent.addListener(this.objDirection, "error", this.onError.bind(this));

// v3
this.directionsService = new google.maps.DirectionsService();
this.directionsService.route({
    origin: this.strFrom,
    destination: this.strTo,
    travelMode: google.maps.TravelMode.DRIVING
}, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
        this.onDirectionsResult(result);
    } else {
        this.onError(status);
    }
});
```

**4b. Response structure mapping:**

| v2 Access Pattern | v3 Access Pattern |
|---|---|
| `objDirection.getPolyline()` | Extract from `result.routes[0].overview_path` (deprecated in newer v3) OR decode `result.routes[0].overview_polyline.points` |
| `objDirection.getRoute(0).getNumSteps()` | `result.routes[0].legs[0].steps.length` |
| `objDirection.getRoute(0).getStep(n)` | `result.routes[0].legs[0].steps[n]` |
| `step.getDistance().meters` | `step.distance.value` |
| `step.getDuration().seconds` | `step.duration.value` |
| `step.getDescriptionHtml()` | `step.instructions` |
| `step.getPolylineIndex()` | Must compute: cumulative vertex offset across steps |

**Critical issue — polyline index tracking:** In v2, each step had a `getPolylineIndex()` that told you which vertex in the overall polyline corresponded to that step. In v3, this doesn't exist directly. We need to build a lookup table that maps step index → vertex index by summing up the number of points in each step's polyline.

**Step-to-vertex index mapping strategy:**

```mermaid
flowchart TB
    subgraph "DirectionsResult"
        S0["step[0]<br/>5 points"]
        S1["step[1]<br/>12 points"]
        S2["step[2]<br/>8 points"]
        S3["step[3]<br/>20 points"]
    end

    subgraph "Built Lookup Table"
        L0["stepIndex 0 → vertexOffset 0"]
        L1["stepIndex 1 → vertexOffset 5"]
        L2["stepIndex 2 → vertexOffset 17"]
        L3["stepIndex 3 → vertexOffset 25"]
    end

    subgraph "Combined Polyline Path"
        P["vertices 0..45<br/>(concatenated step paths)"]
    end

    S0 --> L0
    S1 --> L1
    S2 --> L2
    S3 --> L3
    L0 -.lookup.-> P
    L1 -.lookup.-> P
    L2 -.lookup.-> P
    L3 -.lookup.-> P

    classDef step fill:#e1f5fe
    classDef lookup fill:#fff3e0
    classDef path fill:#e8f5e9
    class S0,S1,S2,S3 step
    class L0,L1,L2,L3 lookup
    class P path
```

**4c. Building the route polyline:**
The v3 `DirectionsResult` gives us `overview_path` (simplified) or individual step polylines (encoded). For animation accuracy, we need the full detailed path. Strategy: concatenate all `step.path` arrays from `routes[0].legs[0].steps[].path` into a single `MVCArray<LatLng>`.

**4d. Geocoding for planes:**
```
// v2 (car.js:1329-1332)
this.objGeoCoder.getLatLng(this.objPlane.strFrom, this.loadFrom.bind(this));

// v3
this.geocoder.geocode({ address: this.objPlane.strFrom }, (results, status) => {
    if (status === google.maps.GeocoderStatus.OK) {
        this.loadFrom(results[0].geometry.location);
    }
});
```

**4e. Error handling:**
Replace v2 error constants (`G_GEO_TOO_MANY_QUERIES`, etc.) with v3 status codes (`google.maps.GeocoderStatus.OVER_QUERY_LIMIT`, etc.).

**4f. Vehicle initialization flow (v2 vs v3):**

```mermaid
sequenceDiagram
    participant UI as UI (start())
    participant Anim as Animation
    participant Veh as Vehicle
    participant DS as DirectionsService
    participant Geo as Geocoder
    participant Map as google.maps.Map

    UI->>Anim: test(cars=4, planes=4)
    Anim->>Anim: init() — create google.maps.Map
    loop for each vehicle
        Anim->>Veh: new Vehicle()
        alt car
            Veh->>DS: route({origin, destination, travelMode})
            DS-->>Veh: DirectionsResult
            Veh->>Veh: build polyline from steps[].path
            Veh->>Veh: build step→vertex index lookup
            Veh-->>Anim: ready
        else plane
            Veh->>Geo: geocode({address: from})
            Geo-->>Veh: from LatLng
            Veh->>Geo: geocode({address: to})
            Geo-->>Veh: to LatLng
            Veh->>Veh: build straight-line polyline
            Veh-->>Anim: ready
        end
        Anim->>Map: addOverlay(polyline)
        Anim->>Map: addOverlay(ELabel with canvas)
    end
    Anim->>Anim: run() — start animation loop
```

**Verification criteria:**
- Create a Vehicle with two known addresses
- `DirectionsService` returns a valid route
- Polyline is built and displayed on map
- Step tracking works (can identify which step the vehicle is on)
- Speed is calculated correctly from step distance/duration

---

### Layer 5: `Animation` loop + vehicle management

**What changes:**
- Replace `google.maps.LatLngBounds` (already partially done — line 247 uses v3 syntax but line 333 uses `GPolyline`)
- Replace `this.objMap.getCenter().distanceFrom(...)` with `google.maps.geometry.spherical.computeDistanceBetween()`
- Replace `this.objMap.getBoundsZoomLevel(objBounds)` with a custom function (v3 removed this; use `map.fitBounds()` or compute zoom manually)
- Replace camera panning logic that creates temporary `GPolyline` for interpolation (line 333-337)
- Replace `setZoom()` with smoother transition
- Fix `loadVehicles` to use the new callback-based initialization (no more polling for `booReady`)

**5a. Animation loop flow:**

```mermaid
sequenceDiagram
    participant Run as Animation.run()
    participant Draw as Animation.draw()
    participant V as Vehicle[i]
    participant Poly as PolyUtil
    participant Map as google.maps.Map

    Run->>Run: wait for all vehicles ready
    Run->>Draw: setTimeout(draw, interval)

    loop every tick (50ms)
        Draw->>V: getCurrentPoint()
        V->>Poly: getPointAtDistance(path, intDistance)
        Poly-->>V: LatLng at distance
        V-->>Draw: current LatLng

        Draw->>Map: extend bounds with current point

        alt car
            Draw->>V: moveCar()
            V->>V: check if crossed step boundary
            V->>V: update speed from step
        else plane
            Draw->>V: movePlane()
            V->>V: increment distance by speed
        end

        Draw->>Draw: intDistance += fastForward * speed / interval
        Draw->>V: plotVehicle(bearing) — rotate canvas sprite
    end

    Draw->>Draw: compute camera center from bounds
    Draw->>Draw: compute zoom from bounds + vehicle spread
    Draw->>Map: setCenter(center) — smooth pan
    Draw->>Map: setZoom(zoom)
    Draw->>Draw: setTimeout(draw, interval)
```

**5b. Camera zoom calculation (replacing `getBoundsZoomLevel`):**

```mermaid
flowchart LR
    A["bounds"] --> B["lat span, lng span"]
    B --> C["pixel span = map dimensions"]
    C --> D["zoom for lat"]
    C --> E["zoom for lng"]
    D --> F["min of both zooms"]
    E --> F
    F --> G["clamp to minZoom/maxZoom"]
    G --> H["apply speed-based zoom cap"]
    H --> I["final zoom level"]
```

**getBoundsZoomLevel replacement:**
v3 doesn't have `getBoundsZoomLevel()`. Two options:
1. Use `map.fitBounds(bounds)` — but this is instant, no smooth zoom
2. Implement manually: calculate the zoom level at which the bounds fit in the current viewport dimensions

We'll implement the manual calculation to preserve the smooth zoom behavior.

**Verification criteria:**
- Multiple vehicles (4 cars + 4 planes) animate simultaneously
- Camera smoothly follows all vehicles
- Zoom adjusts dynamically based on vehicle spread
- Vehicles fade out on arrival
- Animation stops when all vehicles finish

---

### Layer 6: Cleanup and edge cases

- Remove all remaining v2 references
- Fix any `GSize` / `GPoint` usages (replace with `{width, height}` / `{x, y}` literals)
- Fix `G_START_ICON`, `G_END_ICON`, `G_PAUSE_ICON` — replace with custom marker icons or remove
- Update `onunload` handler removal
- Test on Chrome, Firefox, Safari

---

### Target Architecture — Class Diagram

```mermaid
classDiagram
    class Animation {
        +Map objMap
        +Vehicle[] arrVehicles
        +Number intIntervalTimer
        +Number intFastFoward
        +Boolean booReady
        +init()
        +run()
        +draw()
        +addVehicle(Vehicle)
        +loadVehicles()
        +bearing(LatLng, LatLng) Number
        +moveCar(Vehicle)
        +movePlane(Vehicle)
        +plotVehicle(Vehicle, Number)
        +computeBoundsZoom(LatLngBounds) Number
    }

    class Vehicle {
        +String strType
        +String strFrom
        +String strTo
        +Number intDistance
        +Number intSpeed
        +Number intEndOfLine
        +Polyline objPoly
        +ELabel objMarker
        +Boolean booReady
        +init(Function)
        +initCheckPoints()
        +onDirectionsResult(result)
        +getCurrentPoint() LatLng
        +getStartMarker() LatLng
        +getEndMarker() LatLng
        +getCanvasContext() CanvasCtx
        +addAllMarkers(Map)
        +onTripComplete()
    }

    class FlightPlan {
        +Vehicle objPlane
        +LatLng objFrom
        +LatLng objTo
        +Number intTravelSecondsTime
        +move(Number)
        +init()
        +initFrom()
        +initTo()
        +initSteps()
    }

    class VehicleImage {
        +String strPathImages
        +Image objImageTop
        +Image objImageBottom
        +Image objImageLeft
        +Image objImageRight
        +Image objImageTopLeft
        +Image objImageTopRight
        +Image objImageBottomLeft
        +Image objImageBottomRight
        +loadSimple(String)
        +loadComplete()
    }

    class ELabel {
        +LatLng point
        +String html
        +Size pixelOffset
        +Number percentOpacity
        +onAdd()
        +draw()
        +onRemove()
        +show()
        +hide()
        +setPoint(LatLng)
        +setOpacity(Number)
    }

    class PolyUtil {
        <<static>>
        +polylineDistance(MVCArray) Number
        +getPointAtDistance(MVCArray, Number) LatLng
        +getIndexAtDistance(MVCArray, Number) Number
        +getPointsAtDistance(MVCArray, Number) LatLng[]
        +bearingBetween(MVCArray, Number, Number) Number
        +polygonContains(MVCArray, LatLng) Boolean
        +polygonArea(MVCArray) Number
        +polylineBounds(MVCArray) LatLngBounds
    }

    class OverlayView {
        <<google.maps>>
        +onAdd()
        +draw()
        +onRemove()
    }

    Animation "1" --> "*" Vehicle : manages
    Animation ..> PolyUtil : uses for geometry
    Vehicle "1" --> "1" FlightPlan : plane type only
    Vehicle "1" --> "1" VehicleImage : sprite assets
    Vehicle "1" --> "1" ELabel : map overlay
    Vehicle ..> PolyUtil : uses for position lookup
    ELabel --|> OverlayView : extends
```

### Execution Order Summary

```
Layer 1: index.html + map init          → Verify: map renders
Layer 2: epoly.js → PolyUtil            → Verify: geometry functions work
Layer 3: elabel.js → OverlayView        → Verify: canvas label appears
Layer 4a: Vehicle directions call       → Verify: route fetched
Layer 4b: Response parsing + polyline   → Verify: polyline on map
Layer 4c: Step tracking + speed         → Verify: step transitions work
Layer 4d: Geocoding for planes          → Verify: planes get coordinates
Layer 5: Animation loop + camera        → Verify: full multi-vehicle animation
Layer 6: Cleanup + cross-browser        → Verify: no v2 references remain
```

### Rollback strategy

If Layer 3 (ELabel) proves intractable, switch to `google.maps.Marker` with canvas-generated data URL icons. This loses the live Canvas DOM element but preserves the visual result. The rotation would be done by regenerating the data URL on each sprite change rather than rotating the Canvas in place.
