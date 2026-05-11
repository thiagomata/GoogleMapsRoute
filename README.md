# GoogleMapsRoute -- Traveling in Google Maps

A visualization tool that animates vehicles traveling along real Google Maps routes. Vehicles follow actual driving directions, rotate based on bearing, and the camera dynamically adjusts to keep everything in view.

## Quick Start

```bash
npm install
npm run dev
```

Set your API key:
```bash
export VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Then open the dev server URL in your browser.

## Features

- **Real routes**: Fetches actual driving directions from Google Directions API
- **Vehicle animation**: Time-based movement along polylines with bearing rotation
- **Multi-vehicle**: Fleet management with synchronized animation
- **Multi-color sprites**: Fine-grained directional truck sprites (5-degree resolution) in red, blue, green, and yellow
- **Smart camera**: Dynamic pan/zoom with hysteresis to prevent jitter
- **UI controls**: Speed multiplier slider and progress seek bar
- **Visual feedback**: Traveled path + full route path per vehicle
- **Error handling**: Graceful handling of quota limits, denied requests, zero results

## Architecture

Event-driven, dependency-injected architecture designed for testability:

```
EventBus ──→ Vehicle (pure animation) ──→ emits VehiclePositionEvent
    │
    ├──→ CameraController ──→ reads positions, emits ViewportUpdateEvent
    │
    └──→ MapRenderer ──→ subscribes to events, calls IMapAdapter
```

**Key design principles:**
- ~85% of code is pure functions (zero mocks needed for testing)
- Google Maps is wrapped behind thin interfaces (`IRouteProvider`, `IMapAdapter`)
- All components communicate via a typed `EventBus`
- Fully testable: route errors, camera logic, and animation are all unit tested

### Project Structure

```
src/
├── core/                    # Pure functions (no mocks needed)
│   ├── events.ts            # Typed EventBus
│   └── geometry.ts          # Polyline decode, bearing, haversine
├── vehicles/
│   ├── vehicle.ts           # Pure animation state machine
│   └── fleet.ts             # Multi-vehicle orchestration
├── camera/
│   └── camera-controller.ts # Viewport logic with hysteresis
├── rendering/
│   ├── sprite-loader.ts     # Image preloading and caching
│   ├── sprite-canvas.ts     # Canvas sprite utilities
│   └── map-renderer.ts      # Event subscriber to map updates
├── services/
│   ├── route-provider.ts    # IRouteProvider interface
│   ├── google-route-provider.ts  # Real: DirectionsService wrapper
│   ├── google-maps-loader.ts     # Dynamic Google Maps script loader
│   ├── map-adapter.ts       # IMapAdapter interface
│   ├── google-maps-adapter.ts    # Real: Google Maps rendering
│   └── config.ts            # App configuration
└── main.ts                  # Wiring and entry point

tests/                       # Mirrors src/ structure
├── core/
├── vehicles/
├── camera/
├── services/
├── rendering/
└── integration/             # End-to-end app flow tests

public/images/               # Vehicle sprites and assets
```

## Development

### Run Tests
```bash
npm test              # Watch mode
npm run test:run      # CI mode
npm run test:coverage # With coverage report
```

### Build
```bash
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # Type check
npm run deploy   # Build and deploy to GitHub Pages
```

## Tech Stack

- **TypeScript** - Strong typing for geometry and API contracts
- **Vite** - Fast dev server and production bundler
- **Vitest** - Unit testing with jsdom environment
- **Google Maps JS API v3** - Maps, Directions, and rendering

## Google Maps Setup

Required APIs (enable in Google Cloud Console):
- **Maps JavaScript API** (28,000 free loads/month)
- **Directions API** (40,000 free requests/month)

## Credits

Inspired by the code from econym.org.uk. Created by [Thiago Mata](https://twitter.com/#!/ThiagoMata).
