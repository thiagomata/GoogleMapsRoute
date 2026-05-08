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

## Architecture

This project uses an event-driven, dependency-injected architecture designed for testability:

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

## Features

### Currently Working
- **Real routes**: Fetches actual driving directions from Google Directions API
- **Vehicle animation**: Time-based movement along polylines with bearing rotation
- **Multi-vehicle**: Fleet management with synchronized animation
- **Smart camera**: Dynamic pan/zoom with hysteresis to prevent jitter
- **Visual feedback**: Green traveled path + red full route path
- **Error handling**: Graceful handling of quota limits, denied requests, zero results
- **Sprite system**: 16-angle truck sprites (22.5 degree increments) for smooth rotation

### Coming Soon
- Planes and multiple vehicle types
- Random route generation
- User-defined origin/destination
- Checkpoint markers and step-by-step directions
- Speed, distance, and ETA display
- UI controls (vehicle count, path toggles, reset)
- Fade-out animations on arrival
- Smooth camera transitions

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
```

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
│   ├── map-adapter.ts       # IMapAdapter interface
│   ├── google-maps-adapter.ts    # Real: Google Maps rendering
│   └── config.ts            # App configuration
└── main.ts                  # Wiring and entry point

tests/                       # Mirrors src/ structure
├── core/
├── vehicles/
├── camera/
├── services/
└── rendering/

old/                         # Legacy v2/v3 code (preserved for reference)
public/images/               # Vehicle sprites and assets
```

## Testability

| Layer | What | How to test |
|-------|------|-------------|
| `core/` | Pure functions | Direct assertions, no mocks |
| `vehicles/` | Animation math | Inject synthetic routes |
| `camera/` | Viewport logic | Feed synthetic position events |
| `services/` | Route fetching | `MockRouteProvider` for all error scenarios |
| `rendering/` | Map updates | `MockMapAdapter` implements `IMapAdapter` |

### Example: Testing Route Errors
```typescript
const provider = new MockRouteProvider(
  createRouteError('OVER_QUERY_LIMIT')
)
// Test your code handles quota exhaustion gracefully
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

See [docs/GOOGLE_MAPS_SETUP.md](docs/GOOGLE_MAPS_SETUP.md) for detailed setup instructions.

## Legacy Code

The original v2/v3 implementations are preserved in `old/` for reference. This v4 rewrite maintains the core functionality while adding:
- Full test coverage
- Clean separation of concerns
- Dependency injection for testability
- TypeScript type safety
- Modern build tooling (Vite + Vitest)

## Credits

Inspired by the code from econym.org.uk. Created by [Thiago Mata](https://twitter.com/#!/ThiagoMata).
