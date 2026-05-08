import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus } from '../../src/core/events'
import { MockMapAdapter } from './mock-map-adapter'
import type { LatLng } from '../../src/core/geometry'

function fakeImage() {
  return { width: 64, height: 64 } as unknown as HTMLImageElement
}

vi.mock('../../src/rendering/sprite-loader', () => ({
  SpriteLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(fakeImage()),
    loadAll: vi.fn().mockResolvedValue([fakeImage()]),
    getCached: vi.fn(() => fakeImage()),
    clear: vi.fn(),
  })),
}))

describe('MapRenderer', () => {
  let bus: EventBus
  let adapter: MockMapAdapter

  const simplePath: LatLng[] = [
    { lat: -33.8688, lng: 151.2093 },
    { lat: -33.9, lng: 151.3 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    bus = new EventBus()
    adapter = new MockMapAdapter()

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
  })

  it('creates marker and polylines when vehicle is added', async () => {
    const { MapRenderer } = await import('../../src/rendering/map-renderer')
    const renderer = new MapRenderer(bus, adapter, { spriteBasePath: 'test-sprites' })
    vi.spyOn(renderer, 'initialize').mockResolvedValue(undefined)

    await renderer.initialize()
    renderer.addVehicle('v1', simplePath)

    expect(adapter.markers.length).toBe(1)
    expect(adapter.polylines.length).toBe(2)
  })

  it('updates marker position on vehicle:update event', async () => {
    const { MapRenderer } = await import('../../src/rendering/map-renderer')
    const renderer = new MapRenderer(bus, adapter, { spriteBasePath: 'test-sprites' })
    vi.spyOn(renderer, 'initialize').mockResolvedValue(undefined)

    await renderer.initialize()
    renderer.addVehicle('v1', simplePath)

    const newPosition: LatLng = { lat: -33.88, lng: 151.25 }
    bus.emit('vehicle:update', {
      vehicleId: 'v1',
      position: newPosition,
      bearing: 45,
      distanceTraveled: 1000,
      status: 'moving',
    })

    const marker = adapter.markers[0]
    expect(marker.getPosition()).toEqual(newPosition)
  })

  it('keeps marker visible when vehicle arrives', async () => {
    const { MapRenderer } = await import('../../src/rendering/map-renderer')
    const renderer = new MapRenderer(bus, adapter, { spriteBasePath: 'test-sprites' })
    vi.spyOn(renderer, 'initialize').mockResolvedValue(undefined)

    await renderer.initialize()
    renderer.addVehicle('v1', simplePath)

    bus.emit('vehicle:update', {
      vehicleId: 'v1',
      position: simplePath[1],
      bearing: 90,
      distanceTraveled: 10000,
      status: 'arrived',
    })

    const marker = adapter.markers[0]
    expect(marker.isVisible()).toBe(true)
  })

  it('updates traveled path on vehicle update', async () => {
    const { MapRenderer } = await import('../../src/rendering/map-renderer')
    const renderer = new MapRenderer(bus, adapter, { spriteBasePath: 'test-sprites' })
    vi.spyOn(renderer, 'initialize').mockResolvedValue(undefined)

    await renderer.initialize()
    renderer.addVehicle('v1', simplePath)

    bus.emit('vehicle:update', {
      vehicleId: 'v1',
      position: simplePath[0],
      bearing: 0,
      distanceTraveled: 500,
      status: 'moving',
    })

    expect(adapter.polylines.length).toBe(2)
  })

  it('handles fitBounds event', async () => {
    const { MapRenderer } = await import('../../src/rendering/map-renderer')
    const renderer = new MapRenderer(bus, adapter, { spriteBasePath: 'test-sprites' })
    vi.spyOn(renderer, 'initialize').mockResolvedValue(undefined)

    await renderer.initialize()
    renderer.addVehicle('v1', simplePath)

    renderer.handleFitBounds(simplePath)

    expect(adapter.fitBoundsCalls.length).toBe(1)
    expect(adapter.fitBoundsCalls[0]).toEqual(simplePath)
  })
})
