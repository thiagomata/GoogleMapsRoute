import { Vehicle, type VehicleStateEvent, type VehicleOptions } from './vehicle'
import type { EventBus } from '../core/events'

export class Fleet {
  private vehicles: Map<string, Vehicle> = new Map()
  private bus: EventBus
  private animationId: number | null = null
  private speedMultiplier: number = 1
  private rawProgress: number = 0
  private progressRate: number = 0
  private realSpeed: number = 10
  private lastFrameTime: number = 0
  private manualProgress: number | null = null
  private maxDistance: number = 0
  private maxProgress: number = 1

  constructor(bus: EventBus) {
    this.bus = bus
  }

  addVehicle(options: VehicleOptions, _speedMetersPerSecond?: number): void {
    const vehicle = new Vehicle(options)
    this.vehicles.set(options.id, vehicle)
  }

  startAll(_referenceTime?: number): void {
    this.rawProgress = 0
    this.manualProgress = null
    this.maxDistance = 0
    this.vehicles.forEach((v) => {
      const d = v.getTotalDistance()
      if (d > this.maxDistance) this.maxDistance = d
    })
    this.maxProgress = 0
    this.vehicles.forEach((v) => {
      const needed = v.startProgress + v.getTotalDistance() / this.maxDistance
      if (needed > this.maxProgress) this.maxProgress = needed
    })
    this.progressRate = this.maxDistance > 0 ? this.realSpeed / this.maxDistance : 1 / 30
    console.log('[Fleet]', 'Starting, vehicles:', this.vehicles.size, 'maxDistance:', this.maxDistance, 'maxProgress:', this.maxProgress, 'progressRate:', this.progressRate)
    this.lastFrameTime = Date.now()
    this.animationId = requestAnimationFrame(() => this._tick(Date.now()))
  }

  stopAll(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.get(id)
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, multiplier)
  }

  getOverallProgress(): number {
    const raw = this.manualProgress ?? this.rawProgress
    return Math.min(1, raw / this.maxProgress)
  }

  setProgress(p: number): void {
    this.manualProgress = Math.max(0, Math.min(this.maxProgress, p * this.maxProgress))
    this.emitStates()
  }

  resume(): void {
    this.rawProgress = this.manualProgress ?? this.rawProgress
    this.manualProgress = null
    if (this.rawProgress < this.maxProgress && this.animationId === null) {
      this.lastFrameTime = Date.now()
      this.animationId = requestAnimationFrame(() => this._tick(Date.now()))
    }
  }

  private getVehicleDistance(routeDistance: number, overallProgress: number, startProgress: number): number {
    if (overallProgress < startProgress) return 0
    const traveled = (overallProgress - startProgress) * this.maxDistance
    return Math.min(traveled, routeDistance)
  }

  private getRawProgress(): number {
    return this.manualProgress ?? this.rawProgress
  }

  getAllStates(now?: number): VehicleStateEvent[] {
    const progress = this.getRawProgress()
    const currentTime = now ?? Date.now()
    return Array.from(this.vehicles.values()).map((v) => {
      const dist = this.getVehicleDistance(v.getTotalDistance(), progress, v.startProgress)
      return v.getState(dist, currentTime)
    })
  }

  allArrived(_now?: number): boolean {
    const progress = this.getRawProgress()
    return Array.from(this.vehicles.values()).every((v) => {
      const dist = this.getVehicleDistance(v.getTotalDistance(), progress, v.startProgress)
      return dist >= v.getTotalDistance()
    })
  }

  private emitStates(): void {
    const progress = this.getRawProgress()
    const now = Date.now()
    const states: VehicleStateEvent[] = []
    this.vehicles.forEach((v) => {
      const dist = this.getVehicleDistance(v.getTotalDistance(), progress, v.startProgress)
      states.push(v.getState(dist, now))
    })

    states.forEach((state) => {
      this.bus.emit('vehicle:update', {
        vehicleId: state.vehicleId,
        position: state.position,
        bearing: state.bearing,
        progress: state.progress,
        distanceTraveled: state.distanceTraveled,
        status: state.status,
      })
    })

    const positions = states.map((s) => s.position)
    this.bus.emit('fleet:positions', {
      positions,
      states,
      allArrived: this.allArrived(),
      speedMetersPerSecond: this.realSpeed * this.speedMultiplier,
    })
  }

  private _tick = (now: number): void => {
    const deltaMs = now - this.lastFrameTime
    this.lastFrameTime = now

    if (this.manualProgress === null) {
      this.rawProgress += (deltaMs / 1000) * this.progressRate * this.speedMultiplier
      this.rawProgress = Math.min(this.maxProgress, this.rawProgress)
    }

    this.emitStates()

    if (this.manualProgress === null && this.allArrived()) {
      this.bus.emit('fleet:complete', { timestamp: now })
      this.animationId = null
      return
    }

    this.animationId = requestAnimationFrame(() => this._tick(Date.now()))
  }
}
