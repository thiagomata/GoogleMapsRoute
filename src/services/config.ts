import type { LatLng } from '../core/geometry'
import type { CameraConfig } from '../camera/camera-controller'
import type { MapRendererConfig } from '../rendering/map-renderer'
import type { VehicleOptions } from '../vehicles/vehicle'

export interface FleetConfig {
  speedMetersPerSecond: number
  desiredGapMeters: number
}

export interface AppConfig {
  apiKey: string
  defaultCenter: LatLng
  defaultZoom: number
  camera: Partial<CameraConfig>
  mapRenderer: Partial<MapRendererConfig>
  fleet: FleetConfig
  demoVehicles: VehicleOptions[]
}

export const config: AppConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  defaultCenter: { lat: -33.8688, lng: 151.2093 },
  defaultZoom: 12,
  camera: {
    defaultZoom: 12,
    minZoom: 3,
    maxZoom: 18,
    targetCoverage: 0.5,
    throttleMs: 1000,
    zoomCooldownMs: 2000,
  },
  mapRenderer: {
    spriteBasePath: 'images/trucks/red_360',
    traveledPathColor: '#00FF00',
    fullPathColor: '#FF0000',
    strokeWidth: 4,
    vehicleSize: 64,
  },
  fleet: {
    speedMetersPerSecond: 10,
    desiredGapMeters: 30,
  },
  demoVehicles: [],
}
