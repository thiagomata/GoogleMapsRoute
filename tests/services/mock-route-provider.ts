import type { LatLng } from '../core/geometry'
import type { RouteRequest, RouteResult, RawRoute } from '../services/route-provider'
import { type IRouteProvider, createRouteError } from '../services/route-provider'

export class MockRouteProvider implements IRouteProvider {
  private fixture: RawRoute | ReturnType<typeof createRouteError>

  constructor(fixture: RawRoute | ReturnType<typeof createRouteError>) {
    this.fixture = fixture
  }

  async fetchRoute(_params: RouteRequest): Promise<RawRoute> {
    if (this.fixture instanceof Error) {
      throw this.fixture
    }
    return this.fixture
  }
}

export function createTestRoute(
  from: LatLng,
  to: LatLng,
  distanceMeters: number = 10000,
  durationSeconds: number = 600,
): RawRoute {
  const steps = Math.max(1, Math.floor(distanceMeters / 100))
  const path: LatLng[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    })
  }

  return {
    path,
    steps: [
      {
        path,
        distanceMeters,
        durationSeconds,
        instructions: 'Test route',
      },
    ],
    distanceMeters,
    durationSeconds,
  }
}
