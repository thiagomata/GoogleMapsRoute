import { describe, it, expect } from 'vitest'
import { Vehicle } from '../../src/vehicles/vehicle'
import type { LatLng } from '../../src/core/geometry'

function straightPath(km: number, points: number = 100): LatLng[] {
  const path: LatLng[] = []
  const step = (km * 1000) / (points - 1)
  for (let i = 0; i < points; i++) {
    const meters = i * step
    const degrees = meters / 111320
    path.push({ lat: 0, lng: degrees })
  }
  return path
}

describe('Vehicle', () => {
  const path10km = straightPath(10)
  const path1000km = straightPath(1000)
  const baseTime = 1000000000000

  it('starts at the first point', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km, speedMetersPerSecond: 10 })
    vehicle.start(baseTime)

    const state = vehicle.getState(baseTime)
    expect(state.position).toEqual(path10km[0])
    expect(state.status).toBe('waiting')
    expect(state.progress).toBe(0)
  })

  it('transitions to moving after start delay', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km, speedMetersPerSecond: 10, startDelayMs: 1000 })
    vehicle.start(baseTime)

    expect(vehicle.getState(baseTime + 500).status).toBe('waiting')
    expect(vehicle.getState(baseTime + 1500).status).toBe('moving')
  })

  it('moves along the path over time', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path1000km, speedMetersPerSecond: 100 })
    vehicle.start(baseTime)

    const start = vehicle.getState(baseTime + 1000)
    const later = vehicle.getState(baseTime + 2000)

    expect(later.distanceTraveled).toBeGreaterThan(start.distanceTraveled)
    expect(later.progress).toBeGreaterThan(start.progress)
  })

  it('travels at the correct speed', () => {
    const speed = 50
    const vehicle = new Vehicle({ id: 'v1', path: path1000km, speedMetersPerSecond: speed })
    vehicle.start(baseTime)

    const elapsedMs = 10000
    const state = vehicle.getState(baseTime + elapsedMs)
    expect(state.distanceTraveled).toBeCloseTo(speed * (elapsedMs / 1000), 0)
  })

  it('arrives at the end of the path', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km, speedMetersPerSecond: 100 })
    vehicle.start(baseTime)

    const state = vehicle.getState(baseTime + 200000)
    expect(state.status).toBe('arrived')
    expect(state.progress).toBe(1)
  })

  it('stays at arrival position after arriving', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km, speedMetersPerSecond: 100 })
    vehicle.start(baseTime)

    const arrivalState = vehicle.getState(baseTime + 200000)
    const laterState = vehicle.getState(baseTime + 400000)

    expect(laterState.position).toEqual(arrivalState.position)
    expect(laterState.status).toBe('arrived')
  })

  it('reports correct bearing', () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]
    const vehicle = new Vehicle({ id: 'v1', path, speedMetersPerSecond: 1000 })
    vehicle.start(baseTime)

    const state = vehicle.getState(baseTime + 5000)
    expect(state.bearing).toBeGreaterThan(80)
    expect(state.bearing).toBeLessThan(100)
  })

  it('isArrived returns true only after arrival', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km, speedMetersPerSecond: 10 })
    vehicle.start(baseTime)

    expect(vehicle.isArrived(baseTime + 100)).toBe(false)
    expect(vehicle.isArrived(baseTime + 2000000)).toBe(true)
  })
})
