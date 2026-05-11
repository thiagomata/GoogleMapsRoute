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

  it('returns start position at distance 0', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km })
    const state = vehicle.getState(0)
    expect(state.position).toEqual(path10km[0])
    expect(state.status).toBe('waiting')
    expect(state.progress).toBe(0)
  })

  it('transitions to moving once distance is traveled', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km })
    const waiting = vehicle.getState(0)
    expect(waiting.status).toBe('waiting')

    const moving = vehicle.getState(1)
    expect(moving.status).toBe('moving')
  })

  it('moves along the path with increasing distance', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path1000km })
    const start = vehicle.getState(100)
    const later = vehicle.getState(500)

    expect(later.distanceTraveled).toBeGreaterThan(start.distanceTraveled)
    expect(later.progress).toBeGreaterThan(start.progress)
  })

  it('arrives at the end of the path', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km })
    const total = vehicle.getTotalDistance()
    const state = vehicle.getState(total)

    expect(state.status).toBe('arrived')
    expect(state.progress).toBe(1)
  })

  it('stays at arrival position after arriving', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km })
    const total = vehicle.getTotalDistance()
    const arrivalState = vehicle.getState(total)
    const laterState = vehicle.getState(total + 10000)

    expect(laterState.position).toEqual(arrivalState.position)
    expect(laterState.status).toBe('arrived')
  })

  it('reports correct bearing', () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]
    const vehicle = new Vehicle({ id: 'v1', path })
    const state = vehicle.getState(50000)
    expect(state.bearing).toBeGreaterThan(80)
    expect(state.bearing).toBeLessThan(100)
  })

  it('exposes total distance', () => {
    const vehicle = new Vehicle({ id: 'v1', path: path10km })
    expect(vehicle.getTotalDistance()).toBeGreaterThan(0)
  })
})
