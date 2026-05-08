import { Vehicle, type VehicleStateEvent, type VehicleOptions } from './vehicle'
import type { EventBus } from '../core/events'

export class Fleet {
  private vehicles: Map<string, Vehicle> = new Map()
  private bus: EventBus
  private animationId: number | null = null

  constructor(bus: EventBus) {
    this.bus = bus
  }

  addVehicle(options: VehicleOptions): void {
    const vehicle = new Vehicle(options)
    this.vehicles.set(options.id, vehicle)
  }

  startAll(referenceTime?: number): void {
    const now = referenceTime ?? Date.now()
    console.log('[Fleet]', 'Starting all vehicles, count:', this.vehicles.size)
    this.vehicles.forEach((v) => v.start(now))
    console.log('[Fleet]', 'Vehicles started, ticking...')
    this._tick(now)
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

  getAllStates(now?: number): VehicleStateEvent[] {
    return Array.from(this.vehicles.values()).map((v) => v.getState(now))
  }

  getActivePositions(now?: number): { position: import('../core/geometry').LatLng; status: string }[] {
    return this.getAllStates(now).map((s) => ({ position: s.position, status: s.status }))
  }

  allArrived(now?: number): boolean {
    return Array.from(this.vehicles.values()).every((v) => v.isArrived(now))
  }

  setSpeedMultiplier(multiplier: number): void {
    this.vehicles.forEach((v) => v.setSpeedMultiplier(multiplier))
  }

  private _tick = (now: number): void => {
    const states = this.getAllStates(now)
    const allArrived = this.allArrived(now)

    console.log('[Fleet]', 'Tick:', now, 'vehicles:', states.length, 'allArrived:', allArrived)

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
      allArrived: this.allArrived(now),
    })

    if (!this.allArrived(now)) {
      this.animationId = requestAnimationFrame(() => this._tick(Date.now()))
    } else {
      this.bus.emit('fleet:complete', { timestamp: now })
      this.animationId = null
    }
  }
}
