import type { LatLng } from '../core/geometry'
import type { EventBus } from '../core/events'

export interface CameraConfig {
  defaultZoom: number
  initialZoom: number
  minZoom: number
  maxZoom: number
  targetCoverage: number
  throttleMs: number
  zoomCooldownMs: number
}

const DEFAULT_CONFIG: CameraConfig = {
  defaultZoom: 12,
  initialZoom: 14,
  minZoom: 3,
  maxZoom: 18,
  targetCoverage: 0.5,
  throttleMs: 1000,
  zoomCooldownMs: 2000,
}

export class CameraController {
  private bus: EventBus
  private config: CameraConfig
  private currentZoom: number
  private lastUpdate: number = 0
  private lastZoomChange: number = -9999999999999
  private currentCenter: LatLng | null = null

  constructor(bus: EventBus, config: Partial<CameraConfig> = {}) {
    this.bus = bus
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentZoom = config.defaultZoom ?? DEFAULT_CONFIG.defaultZoom

    this.bus.on('fleet:positions', (event) => {
      this.handlePositions(event.payload.positions as LatLng[], event.payload.allArrived as boolean)
    })
  }

  private handlePositions(positions: LatLng[], allArrived: boolean): void {
    if (positions.length === 0) return

    const now = Date.now()
    if (now - this.lastUpdate < this.config.throttleMs) return

    const center = this.calculateCenter(positions)

    if (allArrived) {
      console.log('[Camera]', 'All arrived, emitting fitBounds')
      this.bus.emit('camera:fitbounds', { points: positions })
      this.currentCenter = center
      this.lastUpdate = now
      return
    }

    if (this.currentCenter === null) {
      const initialZoom = this.config.initialZoom
      console.log('[Camera]', 'First update, zoom:', initialZoom)
      this.bus.emit('camera:update', { center, zoom: initialZoom })
      this.currentCenter = center
      this.currentZoom = initialZoom
      this.lastUpdate = now
      return
    }

    const bounds = this.calculateBounds(positions)
    const maxSpan = Math.max(bounds.latSpan, bounds.lngSpan)
    if (maxSpan === 0) return

    const targetZoom = this.calculateZoom(positions, center)
    const finalZoom = this.applyZoomHysteresis(targetZoom, now)

    if (
      this.distance(this.currentCenter, center) > 0.001 ||
      Math.abs(this.currentZoom - finalZoom) > 0.5
    ) {
      console.log('[Camera]', 'Emitting update:', { center, zoom: finalZoom })
      this.bus.emit('camera:update', { center, zoom: finalZoom })
      this.currentCenter = center
      this.currentZoom = finalZoom
    }

    this.lastUpdate = now
  }

  private calculateCenter(positions: LatLng[]): LatLng {
    const minLat = Math.min(...positions.map((p) => p.lat))
    const maxLat = Math.max(...positions.map((p) => p.lat))
    const minLng = Math.min(...positions.map((p) => p.lng))
    const maxLng = Math.max(...positions.map((p) => p.lng))

    return {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    }
  }

  private calculateBounds(positions: LatLng[]): { latSpan: number; lngSpan: number } {
    const minLat = Math.min(...positions.map((p) => p.lat))
    const maxLat = Math.max(...positions.map((p) => p.lat))
    const minLng = Math.min(...positions.map((p) => p.lng))
    const maxLng = Math.max(...positions.map((p) => p.lng))

    return {
      latSpan: maxLat - minLat,
      lngSpan: maxLng - minLng,
    }
  }

  private calculateZoom(positions: LatLng[], center: LatLng): number {
    const bounds = this.calculateBounds(positions)
    const maxSpan = Math.max(bounds.latSpan, bounds.lngSpan)

    if (maxSpan === 0) return this.currentZoom

    const viewportSpan = 360 / Math.pow(2, this.currentZoom)
    const targetSpan = maxSpan / this.config.targetCoverage
    const ratio = viewportSpan / targetSpan

    let zoomDelta = Math.log2(ratio)
    const targetZoom = Math.round(this.currentZoom + zoomDelta)

    return Math.max(this.config.minZoom, Math.min(this.config.maxZoom, targetZoom))
  }

  private applyZoomHysteresis(targetZoom: number, now: number): number {
    const timeSinceLastZoom = now - this.lastZoomChange

    if (timeSinceLastZoom < this.config.zoomCooldownMs) {
      return this.currentZoom
    }

    if (targetZoom !== this.currentZoom) {
      this.lastZoomChange = now
    }

    return targetZoom
  }

  private distance(a: LatLng, b: LatLng): number {
    return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
  }
}
