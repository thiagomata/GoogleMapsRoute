import type { LatLng } from '../core/geometry'

export interface VehicleOptions {
  id: string
  path: LatLng[]
  spriteBasePath?: string
  startProgress?: number
}

export type VehicleStatus = 'waiting' | 'moving' | 'arrived'

export interface VehicleStateEvent {
  vehicleId: string
  position: LatLng
  bearing: number
  progress: number
  distanceTraveled: number
  status: VehicleStatus
  timestamp: number
}

export class Vehicle {
  readonly id: string
  readonly startProgress: number
  private path: LatLng[]
  private totalDistance: number

  constructor(options: VehicleOptions) {
    this.id = options.id
    this.path = options.path
    this.totalDistance = this.calculateTotalDistance()
    this.startProgress = options.startProgress ?? 0
  }

  getState(distanceTraveled: number, now?: number): VehicleStateEvent {
    const currentTime = now ?? Date.now()
    const dist = Math.max(0, Math.min(distanceTraveled, this.totalDistance))
    const progress = this.totalDistance === 0 ? 1 : dist / this.totalDistance

    if (dist <= 0) {
      return {
        vehicleId: this.id,
        position: this.path[0],
        bearing: 0,
        progress: 0,
        distanceTraveled: 0,
        status: 'waiting',
        timestamp: currentTime,
      }
    }

    if (progress >= 1) {
      const lastPoint = this.path[this.path.length - 1]
      const prevPoint = this.path[this.path.length - 2] ?? lastPoint
      return {
        vehicleId: this.id,
        position: lastPoint,
        bearing: this.calculateBearing(prevPoint, lastPoint),
        progress: 1,
        distanceTraveled: this.totalDistance,
        status: 'arrived',
        timestamp: currentTime,
      }
    }

    const state = this.pointAtDistance(this.path, dist)

    return {
      vehicleId: this.id,
      position: state.point,
      bearing: state.bearing,
      progress,
      distanceTraveled: dist,
      status: 'moving',
      timestamp: currentTime,
    }
  }

  getTotalDistance(): number {
    return this.totalDistance
  }

  private calculateTotalDistance(): number {
    let total = 0
    for (let i = 0; i < this.path.length - 1; i++) {
      total += this.haversineDistance(this.path[i], this.path[i + 1])
    }
    return total
  }

  private haversineDistance(a: LatLng, b: LatLng): number {
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  private calculateBearing(from: LatLng, to: LatLng): number {
    const toRad = (d: number) => (d * Math.PI) / 180
    const toDeg = (r: number) => (r * 180) / Math.PI

    const lat1 = toRad(from.lat)
    const lat2 = toRad(to.lat)
    const dLng = toRad(to.lng - from.lng)

    const y = Math.sin(dLng) * Math.cos(lat2)
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

    return (toDeg(Math.atan2(y, x)) + 360) % 360
  }

  private pointAtDistance(path: LatLng[], distanceMeters: number): { point: LatLng; bearing: number } {
    let traveled = 0

    for (let i = 0; i < path.length - 1; i++) {
      const segmentDist = this.haversineDistance(path[i], path[i + 1])

      if (traveled + segmentDist >= distanceMeters) {
        const remaining = distanceMeters - traveled
        const fraction = segmentDist === 0 ? 0 : remaining / segmentDist
        const point = {
          lat: path[i].lat + (path[i + 1].lat - path[i].lat) * fraction,
          lng: path[i].lng + (path[i + 1].lng - path[i].lng) * fraction,
        }
        const brng = this.calculateBearing(path[i], path[i + 1])
        return { point, bearing: brng }
      }

      traveled += segmentDist
    }

    const last = path[path.length - 1]
    const prev = path[path.length - 2] ?? last
    return { point: last, bearing: this.calculateBearing(prev, last) }
  }
}
