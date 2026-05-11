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
  leadTimeMs: number
  followCooldownMs: number
}

const DEFAULT_CONFIG: CameraConfig = {
  defaultZoom: 12,
  initialZoom: 17,
  minZoom: 3,
  maxZoom: 18,
  targetCoverage: 0.5,
  throttleMs: 100,
  zoomCooldownMs: 2000,
  leadTimeMs: 2000,
  followCooldownMs: 2000,
}

export class CameraController {
  private bus: EventBus
  private config: CameraConfig
  private currentZoom: number
  private lastUpdate: number = 0
  private lastZoomChange: number = -9999999999999
  private currentCenter: LatLng | null = null
  private lastPanTime: number = 0
  private wasInSingleMode: boolean = false

  constructor(bus: EventBus, config: Partial<CameraConfig> = {}) {
    this.bus = bus
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentZoom = config.defaultZoom ?? DEFAULT_CONFIG.defaultZoom

    this.bus.on('fleet:positions', (event) => {
      const positions = event.payload.positions as LatLng[]
      const allStates = event.payload.states as Array<{ status: string; bearing: number }> | undefined
      const allArrived = event.payload.allArrived as boolean
      const speed = event.payload.speedMetersPerSecond as number | undefined
      const hasStates = allStates !== undefined
      const moving = hasStates
        ? positions.filter((_, i) => allStates[i]?.status === 'moving')
        : positions

      if (allArrived) {
        this.handleAllArrived(positions)
        return
      }

      if (moving.length === 1 && speed && hasStates) {
        const idx = allStates.findIndex((s) => s.status === 'moving')
        this.handleSingleMoving(positions[idx], allStates[idx].bearing, speed)
      } else {
        this.handleMultiMoving(moving.length > 0 ? moving : positions)
      }
    })
  }

  private handleAllArrived(positions: LatLng[]): void {
    console.log('[Camera]', 'All arrived, emitting fitBounds')
    this.bus.emit('camera:fitbounds', { points: positions })
    this.currentCenter = this.calculateCenter(positions)
    this.lastUpdate = Date.now()
    this.wasInSingleMode = false
  }

  private handleSingleMoving(pos: LatLng, bearing: number, speed: number): void {
    const now = Date.now()

    if (this.currentCenter === null || !this.wasInSingleMode) {
      this.wasInSingleMode = true
      this.bus.emit('camera:update', { center: pos, zoom: this.config.initialZoom })
      this.currentCenter = pos
      this.currentZoom = this.config.initialZoom
      this.lastPanTime = now
      this.lastUpdate = now
      return
    }

    if (now - this.lastPanTime < this.config.followCooldownMs) return

    const predicted = this.predictPosition(pos, bearing, speed, this.config.leadTimeMs / 1000)
    console.log('[Camera]', 'Lead-follow pan to predicted:', predicted)
    this.bus.emit('camera:update', { center: predicted, zoom: this.currentZoom })
    this.currentCenter = predicted
    this.lastPanTime = now
    this.lastUpdate = now
  }

  private handleMultiMoving(positions: LatLng[]): void {
    this.wasInSingleMode = false
    if (positions.length === 0) return

    const now = Date.now()
    if (now - this.lastUpdate < this.config.throttleMs) return

    const center = this.calculateCenter(positions)

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

    let finalZoom: number
    if (maxSpan === 0) {
      finalZoom = positions.length === 1 ? this.config.initialZoom : this.currentZoom
    } else {
      const targetZoom = this.calculateZoom(positions, center)
      finalZoom = this.applyZoomHysteresis(targetZoom, now)
    }

    if (
      this.distance(this.currentCenter, center) > 0.00001 ||
      Math.abs(this.currentZoom - finalZoom) > 0.5
    ) {
      console.log('[Camera]', 'Emitting update:', { center, zoom: finalZoom })
      this.bus.emit('camera:update', { center, zoom: finalZoom })
      this.currentCenter = center
      this.currentZoom = finalZoom
    }

    this.lastUpdate = now
  }

  private predictPosition(pos: LatLng, bearing: number, speedMps: number, leadSeconds: number): LatLng {
    const bearingRad = (bearing * Math.PI) / 180
    const dist = speedMps * leadSeconds
    const latRad = (pos.lat * Math.PI) / 180

    const metersPerDegLat = 111320
    const metersPerDegLng = 111320 * Math.cos(latRad)

    return {
      lat: pos.lat + (dist * Math.cos(bearingRad)) / metersPerDegLat,
      lng: pos.lng + (dist * Math.sin(bearingRad)) / metersPerDegLng,
    }
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
    const zoomingOut = targetZoom < this.currentZoom

    if (zoomingOut) {
      this.lastZoomChange = now
      return targetZoom
    }

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
