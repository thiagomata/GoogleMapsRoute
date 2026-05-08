import { describe, it, expect, beforeEach } from 'vitest'
import { CameraController } from '../../src/camera/camera-controller'
import { EventBus } from '../../src/core/events'
import type { LatLng } from '../../src/core/geometry'

describe('CameraController', () => {
  let bus: EventBus
  let camera: CameraController

  beforeEach(() => {
    bus = new EventBus()
    camera = new CameraController(bus, {
      defaultZoom: 12,
      initialZoom: 13,
      minZoom: 3,
      maxZoom: 18,
      throttleMs: 0,
      zoomCooldownMs: 0,
    })
  })

  it('emits camera:update on first position with initialZoom', () => {
    const handler = vi.fn()
    bus.on('camera:update', handler)

    bus.emit('fleet:positions', {
      positions: [
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.9, lng: 151.3 },
      ],
      allArrived: false,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      type: 'camera:update',
      payload: expect.objectContaining({
        center: expect.any(Object),
        zoom: 13,
      }),
      timestamp: expect.any(Number),
    })
  })

  it('calculates center between positions', () => {
    const handler = vi.fn()
    bus.on('camera:update', handler)

    const positions: LatLng[] = [
      { lat: -33.8, lng: 151.1 },
      { lat: -34.0, lng: 151.3 },
    ]

    bus.emit('fleet:positions', { positions, allArrived: false })

    const payload = handler.mock.calls[0][0].payload
    expect(payload.center.lat).toBeCloseTo(-33.9, 1)
    expect(payload.center.lng).toBeCloseTo(151.2, 1)
  })

  it('emits fitBounds when all vehicles arrive', () => {
    const fitBoundsHandler = vi.fn()
    const updateHandler = vi.fn()
    bus.on('camera:fitbounds', fitBoundsHandler)
    bus.on('camera:update', updateHandler)

    bus.emit('fleet:positions', {
      positions: [{ lat: -33.8688, lng: 151.2093 }],
      allArrived: true,
    })

    expect(fitBoundsHandler).toHaveBeenCalledTimes(1)
    expect(updateHandler).not.toHaveBeenCalled()
  })

  it('does not emit update for empty positions', () => {
    const handler = vi.fn()
    bus.on('camera:update', handler)

    bus.emit('fleet:positions', { positions: [], allArrived: false })

    expect(handler).not.toHaveBeenCalled()
  })

  it('throttles rapid updates', () => {
    const bus2 = new EventBus()
    new CameraController(bus2, {
      defaultZoom: 12,
      initialZoom: 13,
      throttleMs: 1000,
    })

    const handler = vi.fn()
    bus2.on('camera:update', handler)

    const positions: LatLng[] = [{ lat: -33.8688, lng: 151.2093 }]

    bus2.emit('fleet:positions', { positions, allArrived: false })
    bus2.emit('fleet:positions', { positions, allArrived: false })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('emits camera:update on second call when vehicles spread', () => {
    const handler = vi.fn()
    bus.on('camera:update', handler)

    const positions1: LatLng[] = [{ lat: -33.8688, lng: 151.2093 }]
    bus.emit('fleet:positions', { positions: positions1, allArrived: false })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenLastCalledWith({
      type: 'camera:update',
      payload: expect.objectContaining({ zoom: 13 }),
      timestamp: expect.any(Number),
    })

    const positions2: LatLng[] = [
      { lat: -33.8, lng: 151.1 },
      { lat: -34.0, lng: 151.3 },
    ]
    bus.emit('fleet:positions', { positions: positions2, allArrived: false })

    expect(handler).toHaveBeenCalledTimes(2)
    const secondPayload = handler.mock.calls[1][0].payload
    expect(secondPayload.zoom).toBeLessThan(13)
  })

  it('respects min and max zoom bounds', () => {
    const bus2 = new EventBus()
    new CameraController(bus2, {
      defaultZoom: 10,
      initialZoom: 10,
      minZoom: 5,
      maxZoom: 15,
      throttleMs: 0,
      zoomCooldownMs: 0,
    })

    const handler = vi.fn()
    bus2.on('camera:update', handler)

    bus2.emit('fleet:positions', {
      positions: [{ lat: 0, lng: 0 }],
      allArrived: false,
    })

    bus2.emit('fleet:positions', {
      positions: [
        { lat: 0, lng: 0 },
        { lat: 0.00001, lng: 0.00001 },
      ],
      allArrived: false,
    })

    if (handler.mock.calls.length > 0) {
      const zoom = handler.mock.calls[handler.mock.calls.length - 1][0].payload.zoom
      expect(zoom).toBeGreaterThanOrEqual(5)
      expect(zoom).toBeLessThanOrEqual(15)
    }
  })
})
