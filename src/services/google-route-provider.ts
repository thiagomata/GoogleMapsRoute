import type { LatLng, RouteStep, RawRoute } from '../core/geometry'
import { decodePolyline } from '../core/geometry'
import {
  type IRouteProvider,
  type RouteRequest,
  type RouteError,
  createRouteError,
} from './route-provider'

const STATUS_MAP: Record<string, RouteError['type']> = {
  ZERO_RESULTS: 'ZERO_RESULTS',
  OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
  REQUEST_DENIED: 'REQUEST_DENIED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

export class GoogleRouteProvider implements IRouteProvider {
  private service: google.maps.DirectionsService

  constructor() {
    this.service = new google.maps.DirectionsService()
  }

  async fetchRoute(params: RouteRequest): Promise<RawRoute> {
    const waypoints = params.waypoints?.map((wp) => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: true,
    }))

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(params.origin.lat, params.origin.lng),
      destination: new google.maps.LatLng(params.destination.lat, params.destination.lng),
      travelMode: google.maps.TravelMode[params.travelMode],
      waypoints,
    }

    return new Promise((resolve, reject) => {
      this.service.route(request, (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result?.routes?.[0]) {
          const errorType = STATUS_MAP[status] ?? 'UNKNOWN_ERROR'
          reject(createRouteError(errorType, `Directions API returned: ${status}`))
          return
        }

        const route = result.routes[0]
        const legs = route.legs

        let totalDistance = 0
        let totalDuration = 0
        const steps: RouteStep[] = []

        for (const leg of legs) {
          for (const step of leg.steps) {
            const encoded = (step as any).polyline as string
            const path = encoded ? decodePolyline(encoded) : []
            totalDistance += step.distance?.value ?? 0
            totalDuration += step.duration?.value ?? 0

            steps.push({
              path,
              distanceMeters: step.distance?.value ?? 0,
              durationSeconds: step.duration?.value ?? 0,
              instructions: step.instructions ?? '',
            })
          }
        }

        const overviewEncoded = route.overview_polyline as unknown as string
        const fullPath = overviewEncoded ? decodePolyline(overviewEncoded) : []

        resolve({
          path: fullPath,
          steps,
          distanceMeters: totalDistance,
          durationSeconds: totalDuration,
        })
      })
    })
  }
}
