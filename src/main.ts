import { EventBus } from './core/events'
import { Fleet } from './vehicles/fleet'
import { CameraController } from './camera/camera-controller'
import { MapRenderer } from './rendering/map-renderer'
import { GoogleMapsAdapter } from './services/google-maps-adapter'
import { GoogleRouteProvider } from './services/google-route-provider'
import { loadGoogleMapsScript } from './services/google-maps-loader'
import { config } from './services/config'
import type { LatLng } from './core/geometry'

const LOG_PREFIX = '[App]'

async function main() {
  console.log(LOG_PREFIX, 'Starting app...')

  console.log(LOG_PREFIX, 'Loading Google Maps script...')
  await loadGoogleMapsScript(config.apiKey)
  console.log(LOG_PREFIX, 'Google Maps loaded')

  console.log(LOG_PREFIX, 'Creating EventBus...')
  const bus = new EventBus()
  const adapter = new GoogleMapsAdapter()
  const routeProvider = new GoogleRouteProvider()
  console.log(LOG_PREFIX, 'Services created')

  console.log(LOG_PREFIX, 'Creating CameraController...')
  const camera = new CameraController(bus, config.camera)
  console.log(LOG_PREFIX, 'Creating MapRenderer...')
  const renderer = new MapRenderer(bus, adapter, config.mapRenderer)
  console.log(LOG_PREFIX, 'Creating Fleet...')
  const fleet = new Fleet(bus)
  console.log(LOG_PREFIX, 'All components created')

  console.log(LOG_PREFIX, 'Creating map...')
  adapter.createMap({
    center: config.defaultCenter,
    zoom: config.defaultZoom,
  })
  console.log(LOG_PREFIX, 'Map created')

  console.log(LOG_PREFIX, 'Initializing renderer (loading sprites)...')
  await renderer.initialize()
  console.log(LOG_PREFIX, 'Renderer initialized')

  const demoRoutes: Array<{ origin: LatLng; destination: LatLng; id: string }> = [
    {
      id: 'v1',
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.8478, lng: 151.2093 },
    },
    {
      id: 'v2',
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.9, lng: 151.3 },
    },
    {
      id: 'v3',
      origin: { lat: -33.8688, lng: 151.2093 },
      destination: { lat: -33.8, lng: 151.1 },
    },
  ]

  console.log(LOG_PREFIX, 'Setting up UI...')
  const statusEl = document.getElementById('status') as HTMLElement
  const goBtn = document.getElementById('go-btn') as HTMLButtonElement
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement
  const speedDisplay = document.getElementById('speed-display') as HTMLElement
  const progressSlider = document.getElementById('progress-slider') as HTMLInputElement
  const progressDisplay = document.getElementById('progress-display') as HTMLElement

  let speedMultiplier = 1

  speedSlider.addEventListener('input', () => {
    speedMultiplier = parseFloat(speedSlider.value)
    speedDisplay.textContent = `${speedMultiplier}x`
    fleet.setSpeedMultiplier(speedMultiplier)
    console.log(LOG_PREFIX, 'Speed changed to', speedMultiplier, 'x')
  })

  progressSlider.addEventListener('input', () => {
    const p = parseFloat(progressSlider.value)
    progressDisplay.textContent = `${(p * 100).toFixed(1)}%`
    fleet.setProgress(p)
  })

  progressSlider.addEventListener('change', () => {
    fleet.resume()
  })

  goBtn.addEventListener('click', async () => {
    console.log(LOG_PREFIX, 'Go! button clicked')
    goBtn.disabled = true
    statusEl.textContent = 'Fetching routes...'
    statusEl.classList.remove('error')

    try {
      for (let i = 0; i < demoRoutes.length; i++) {
        const route = demoRoutes[i]
        console.log(LOG_PREFIX, `Fetching route for ${route.id}...`)
        const rawRoute = await routeProvider.fetchRoute({
          origin: route.origin,
          destination: route.destination,
          travelMode: 'DRIVING',
        })
        console.log(LOG_PREFIX, `Route ${route.id} fetched: ${rawRoute.path.length} points, ${rawRoute.distanceMeters}m`)

        fleet.addVehicle({
          id: route.id,
          path: rawRoute.path,
          startProgress: i * 0.001,
        })
        console.log(LOG_PREFIX, `Vehicle ${route.id} added, distance: ${rawRoute.distanceMeters}m`)

         const colors = ['red_360', 'blue_360', 'green_360', 'yellow_360']
         const colorIndex = i % colors.length
         const spriteBasePath = `images/trucks/${colors[colorIndex]}`
         renderer.addVehicle(route.id, rawRoute.path, spriteBasePath)
        console.log(LOG_PREFIX, `Vehicle ${route.id} added to renderer`)
      }

      console.log(LOG_PREFIX, 'Starting all vehicles...')
      statusEl.textContent = 'Starting vehicles...'
      progressSlider.disabled = false
      fleet.startAll()
      console.log(LOG_PREFIX, 'Fleet started')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(LOG_PREFIX, 'Error:', error)
      statusEl.textContent = `Error: ${message}`
      statusEl.classList.add('error')
      goBtn.disabled = false
    }
  })

  bus.on('fleet:complete', () => {
    console.log(LOG_PREFIX, 'Fleet complete event received')
    statusEl.textContent = 'All vehicles arrived!'
  })

  bus.on('camera:fitbounds', (event) => {
    console.log(LOG_PREFIX, 'Camera fitBounds event:', event.payload)
    renderer.handleFitBounds(event.payload.points as LatLng[])
  })

  bus.on('camera:update', (event) => {
    console.log(LOG_PREFIX, 'Camera update event:', event.payload)
    adapter.setViewport(event.payload as { center: LatLng; zoom: number })
  })

  bus.on('fleet:positions', () => {
    if (!progressSlider.disabled) {
      const p = fleet.getOverallProgress()
      progressSlider.value = String(p)
      progressDisplay.textContent = `${(p * 100).toFixed(1)}%`
    }
  })

  console.log(LOG_PREFIX, 'App ready. Click "Go!" to start.')
}

main().catch(console.error)
