import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoogleRouteProvider } from '../../src/services/google-route-provider'
import { createRouteError } from '../../src/services/route-provider'
import type { RouteRequest } from '../../src/services/route-provider'

describe('GoogleRouteProvider', () => {
  let mockDirectionsService: {
    route: ReturnType<typeof vi.fn>
  }
  let provider: GoogleRouteProvider

  beforeEach(() => {
    mockDirectionsService = {
      route: vi.fn(),
    }

    vi.stubGlobal('google', {
      maps: {
        DirectionsService: vi.fn(() => mockDirectionsService),
        DirectionsStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
          OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
          REQUEST_DENIED: 'REQUEST_DENIED',
          INVALID_REQUEST: 'INVALID_REQUEST',
          UNKNOWN_ERROR: 'UNKNOWN_ERROR',
        },
        TravelMode: {
          DRIVING: 'DRIVING',
          WALKING: 'WALKING',
        },
        LatLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
      },
    })

    provider = new GoogleRouteProvider()
  })

  it('resolves with route on successful response', async () => {
    const mockResult = {
      routes: [
        {
          overview_polyline: 'w`oeF~nbjO}A_A',
          legs: [
            {
              steps: [
                {
                  polyline: 'w`oeF~nbjO}A_A',
                  distance: { value: 1000 },
                  duration: { value: 120 },
                  instructions: 'Head north',
                },
              ],
            },
          ],
        },
      ],
    }

    mockDirectionsService.route.mockImplementation((_request, callback) => {
      callback(mockResult, 'OK')
    })

    const request: RouteRequest = {
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.9, lng: 151.3 },
      travelMode: 'DRIVING',
    }

    const result = await provider.fetchRoute(request)

    expect(result.path.length).toBeGreaterThan(0)
    expect(result.distanceMeters).toBe(1000)
    expect(result.steps.length).toBe(1)
  })

  it('rejects with ZERO_RESULTS error', async () => {
    mockDirectionsService.route.mockImplementation((_request, callback) => {
      callback(null, 'ZERO_RESULTS')
    })

    const request: RouteRequest = {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.001 },
      travelMode: 'DRIVING',
    }

    await expect(provider.fetchRoute(request)).rejects.toHaveProperty('type', 'ZERO_RESULTS')
  })

  it('rejects with OVER_QUERY_LIMIT error', async () => {
    mockDirectionsService.route.mockImplementation((_request, callback) => {
      callback(null, 'OVER_QUERY_LIMIT')
    })

    const request: RouteRequest = {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.001 },
      travelMode: 'DRIVING',
    }

    await expect(provider.fetchRoute(request)).rejects.toHaveProperty('type', 'OVER_QUERY_LIMIT')
  })

  it('rejects with REQUEST_DENIED error', async () => {
    mockDirectionsService.route.mockImplementation((_request, callback) => {
      callback(null, 'REQUEST_DENIED')
    })

    const request: RouteRequest = {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.001 },
      travelMode: 'DRIVING',
    }

    await expect(provider.fetchRoute(request)).rejects.toHaveProperty('type', 'REQUEST_DENIED')
  })

  it('rejects with UNKNOWN_ERROR for unrecognized status', async () => {
    mockDirectionsService.route.mockImplementation((_request, callback) => {
      callback(null, 'SOME_WEIRD_STATUS')
    })

    const request: RouteRequest = {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.001 },
      travelMode: 'DRIVING',
    }

    await expect(provider.fetchRoute(request)).rejects.toHaveProperty('type', 'UNKNOWN_ERROR')
  })
})
