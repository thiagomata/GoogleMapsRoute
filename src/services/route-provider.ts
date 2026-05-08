import type { LatLng, RawRoute } from '../core/geometry'

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'

export interface RouteRequest {
  origin: LatLng
  destination: LatLng
  waypoints?: LatLng[]
  travelMode: TravelMode
}

export interface RouteError extends Error {
  type:
    | 'ZERO_RESULTS'
    | 'OVER_QUERY_LIMIT'
    | 'REQUEST_DENIED'
    | 'INVALID_REQUEST'
    | 'UNKNOWN_ERROR'
    | 'NETWORK_ERROR'
}

export function createRouteError(type: RouteError['type'], message?: string): RouteError {
  const error = new Error(message ?? `Route error: ${type}`) as RouteError
  error.type = type
  return error
}

export interface IRouteProvider {
  fetchRoute(params: RouteRequest): Promise<RawRoute>
}
