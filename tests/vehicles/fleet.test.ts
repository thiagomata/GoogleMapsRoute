import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventBus } from '../../src/core/events'
import { Fleet } from '../../src/vehicles/fleet'
import type { LatLng } from '../../src/core/geometry'

function straightPath(km: number, points: number = 10): LatLng[] {
  const path: LatLng[] = []
  const step = (km * 1000) / (points - 1)
  for (let i = 0; i < points; i++) {
    const meters = i * step
    const degrees = meters / 111320
    path.push({ lat: 0, lng: degrees })
  }
  return path
}

describe('Fleet', () => {
  let bus: EventBus
  let fleet: Fleet
  const path10km = straightPath(10)
  const path5km = straightPath(5)

  beforeEach(() => {
    vi.useFakeTimers()
    bus = new EventBus()
    fleet = new Fleet(bus)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getOverallProgress returns 0 before startAll', () => {
    expect(fleet.getOverallProgress()).toBe(0)
  })

  it('starts with overall progress near 0', () => {
    const baseTime = 1000000000000
    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.startAll(baseTime)
    const progress = fleet.getOverallProgress()
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThan(0.1)
  })

  it('setProgress updates overall progress', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.addVehicle({ id: 'v2', path: path5km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    fleet.setProgress(0)
    expect(fleet.getOverallProgress()).toBe(0)

    fleet.setProgress(0.5)
    expect(fleet.getOverallProgress()).toBe(0.5)

    fleet.setProgress(1)
    expect(fleet.getOverallProgress()).toBe(1)
  })

  it('setProgress emits fleet:positions event', () => {
    const handler = vi.fn()
    bus.on('fleet:positions', handler)

    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.addVehicle({ id: 'v2', path: path5km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    handler.mockClear()
    fleet.setProgress(0.5)

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0]
    expect(event.payload.positions).toHaveLength(2)
    expect(event.payload.states).toHaveLength(2)
  })

  it('setProgress emits vehicle:update for each vehicle', () => {
    const handler = vi.fn()
    bus.on('vehicle:update', handler)

    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.addVehicle({ id: 'v2', path: path5km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    handler.mockClear()
    fleet.setProgress(0.5)

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('getAllStates returns states for all vehicles', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.addVehicle({ id: 'v2', path: path5km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    const states = fleet.getAllStates(baseTime)
    expect(states).toHaveLength(2)
    expect(states[0].vehicleId).toBe('v1')
    expect(states[1].vehicleId).toBe('v2')
  })

  it('getAllStates reflects setProgress changes', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    fleet.addVehicle({ id: 'v2', path: path5km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    const initialStates = fleet.getAllStates(baseTime)
    expect(initialStates[0].status).toBe('waiting')

    fleet.setProgress(1)
    const finalStates = fleet.getAllStates(baseTime)
    const allArrived = finalStates.every((s) => s.status === 'arrived')
    expect(allArrived).toBe(true)
  })

  it('resume clears manual progress and continues animation', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    fleet.setProgress(0.5)
    expect(fleet.getOverallProgress()).toBe(0.5)

    vi.advanceTimersByTime(100)
    fleet.resume()

    vi.advanceTimersByTime(100)
    expect(fleet.getOverallProgress()).toBeGreaterThan(0.5)
  })

  it('getVehicle returns undefined for unknown id', () => {
    expect(fleet.getVehicle('nonexistent')).toBeUndefined()
  })

  it('getVehicle returns vehicle by id', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    expect(fleet.getVehicle('v1')).toBeDefined()
  })

  it('emits fleet:complete when all vehicles arrive', () => {
    const handler = vi.fn()
    bus.on('fleet:complete', handler)

    fleet.addVehicle({ id: 'v1', path: straightPath(0.01, 2) })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    vi.advanceTimersByTime(5000)
    expect(handler).toHaveBeenCalled()
  })

  it('stopAll stops animation', () => {
    fleet.addVehicle({ id: 'v1', path: path10km })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    fleet.stopAll()
    const progressAfterStop = fleet.getOverallProgress()
    vi.advanceTimersByTime(1000)
    expect(fleet.getOverallProgress()).toBe(progressAfterStop)
  })

  it('setSpeedMultiplier clamps to minimum 0.1', () => {
    fleet.setSpeedMultiplier(0)
    expect(fleet.getOverallProgress()).toBe(0)
  })

  it('handles vehicles with different startProgress values', () => {
    fleet.addVehicle({ id: 'v1', path: path10km, startProgress: 0 })
    fleet.addVehicle({ id: 'v2', path: path10km, startProgress: 0.5 })
    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    fleet.setProgress(0.3)
    const states = fleet.getAllStates(baseTime)
    expect(states[0].status).toBe('moving')
    expect(states[1].status).toBe('waiting')

    fleet.setProgress(0.8)
    const laterStates = fleet.getAllStates(baseTime)
    expect(laterStates[0].status).toBe('arrived')
    expect(laterStates[1].status).toBe('moving')
  })
})
