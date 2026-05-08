import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventBus } from '../../src/core/events'
import { Fleet } from '../../src/vehicles/fleet'
import { CameraController } from '../../src/camera/camera-controller'
import { MapRenderer } from '../../src/rendering/map-renderer'
import { MockMapAdapter } from '../rendering/mock-map-adapter'
import { MockRouteProvider, createTestRoute } from '../services/mock-route-provider'
import type { LatLng } from '../../src/core/geometry'

vi.mock('../../src/rendering/sprite-loader', () => {
  function fakeImage(): HTMLImageElement {
    return { width: 64, height: 64 } as unknown as HTMLImageElement
  }
  return {
    SpriteLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(fakeImage()),
      loadAll: vi.fn().mockResolvedValue(undefined),
      getCached: vi.fn(() => fakeImage()),
      getCacheSize: vi.fn(() => 1),
      clear: vi.fn(),
    })),
  }
})

describe('Integration: full app flow', () => {
  let bus: EventBus
  let mapAdapter: MockMapAdapter
  let fleet: Fleet
  let renderer: MapRenderer

  const sydneyCenter: LatLng = { lat: -33.8688, lng: 151.2093 }

  beforeEach(() => {
    vi.useFakeTimers()
    bus = new EventBus()
    mapAdapter = new MockMapAdapter()

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(Image.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement) {
      setTimeout(() => this.onload?.(new Event('load')))
    })

    renderer = new MapRenderer(bus, mapAdapter, {
      spriteBasePath: 'test-sprites',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('creates vehicles, starts animation, and camera updates', async () => {
    await renderer.initialize()

    const routeProvider = new MockRouteProvider(
      createTestRoute(
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8478, lng: 151.2093 },
        5000,
        300,
      ),
    )

    const rawRoute = await routeProvider.fetchRoute({
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.8478, lng: 151.2093 },
      travelMode: 'DRIVING',
    })

    fleet = new Fleet(bus)
    fleet.addVehicle({
      id: 'v1',
      path: rawRoute.path,
      speedMetersPerSecond: 50,
    })

    renderer.addVehicle('v1', rawRoute.path)

    const camera = new CameraController(bus, {
      defaultZoom: 12,
      initialZoom: 13,
      minZoom: 3,
      maxZoom: 18,
      throttleMs: 0,
      zoomCooldownMs: 0,
    })

    const cameraUpdates: Array<{ center: LatLng; zoom: number }> = []
    bus.on('camera:update', (event) => {
      cameraUpdates.push(event.payload as { center: LatLng; zoom: number })
    })

    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    vi.advanceTimersByTime(50)

    expect(cameraUpdates.length).toBeGreaterThan(0)
    expect(mapAdapter.markers.length).toBe(1)
    expect(mapAdapter.polylines.length).toBe(2)

    vi.advanceTimersByTime(200)

    const marker = mapAdapter.markers[0]
    expect(marker.getPosition()).not.toEqual(rawRoute.path[0])
  })

  it('handles route errors gracefully', async () => {
    const { createRouteError } = await import('../../src/services/route-provider')

    const routeProvider = new MockRouteProvider(
      createRouteError('ZERO_RESULTS')
    )

    await expect(
      routeProvider.fetchRoute({
        origin: { lat: 0, lng: 0 },
        destination: { lat: 0, lng: 0.001 },
        travelMode: 'DRIVING',
      }),
    ).rejects.toHaveProperty('type', 'ZERO_RESULTS')
  })

  it('emits fleet:complete when all vehicles arrive', async () => {
    await renderer.initialize()

    const routeProvider = new MockRouteProvider(
      createTestRoute(
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8478, lng: 151.2093 },
        1000,
        10,
      ),
    )

    const rawRoute = await routeProvider.fetchRoute({
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.8478, lng: 151.2093 },
      travelMode: 'DRIVING',
    })

    fleet = new Fleet(bus)
    fleet.addVehicle({
      id: 'v1',
      path: rawRoute.path,
      speedMetersPerSecond: 100,
    })

    renderer.addVehicle('v1', rawRoute.path)

    const completeHandler = vi.fn()
    bus.on('fleet:complete', completeHandler)

    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    vi.advanceTimersByTime(50)

    const fastRoute = new MockRouteProvider(
      createTestRoute(
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.001 },
        100,
        1,
      ),
    )

    const fastRawRoute = await fastRoute.fetchRoute({
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.001 },
      travelMode: 'DRIVING',
    })

    fleet.addVehicle({
      id: 'v2',
      path: fastRawRoute.path,
      speedMetersPerSecond: 100,
      startDelayMs: 0,
    })

    renderer.addVehicle('v2', fastRawRoute.path)

    fleet.startAll(baseTime)

    vi.advanceTimersByTime(5000)

    expect(completeHandler).toHaveBeenCalled()
  })

  it('camera emits fitBounds when all vehicles arrive', async () => {
    await renderer.initialize()

    const routeProvider = new MockRouteProvider(
      createTestRoute(
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.0001 },
        10,
        1,
      ),
    )

    const rawRoute = await routeProvider.fetchRoute({
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0.0001 },
      travelMode: 'DRIVING',
    })

    fleet = new Fleet(bus)
    fleet.addVehicle({
      id: 'v1',
      path: rawRoute.path,
      speedMetersPerSecond: 100,
    })

    renderer.addVehicle('v1', rawRoute.path)

    new CameraController(bus, {
      defaultZoom: 12,
      initialZoom: 13,
      minZoom: 3,
      maxZoom: 18,
      throttleMs: 0,
      zoomCooldownMs: 0,
    })

    const fitBoundsHandler = vi.fn()
    bus.on('camera:fitbounds', fitBoundsHandler)

    const baseTime = 1000000000000
    fleet.startAll(baseTime)

    await vi.runAllTimersAsync()

    expect(fitBoundsHandler).toHaveBeenCalled()
  })
})
