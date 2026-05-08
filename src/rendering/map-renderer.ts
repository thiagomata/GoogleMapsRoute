import type { LatLng } from '../core/geometry'
import type { EventBus } from '../core/events'
import type { IMapAdapter, MapMarker, MapPolyline } from '../services/map-adapter'
import { SpriteLoader } from './sprite-loader'
import { getSpriteUrl } from './sprite-canvas'

interface VehicleRenderState {
  marker: MapMarker
  traveledPath: MapPolyline
  fullPath: MapPolyline
  lastBearing: number
  spriteBasePath: string
}

export interface MapRendererConfig {
  spriteBasePath: string
  traveledPathColor: string
  fullPathColor: string
  strokeWidth: number
  vehicleSize: number
}

const DEFAULT_CONFIG: MapRendererConfig = {
  spriteBasePath: 'images/trucks/red_360',
  traveledPathColor: '#00FF00',
  fullPathColor: '#FF0000',
  strokeWidth: 4,
  vehicleSize: 64,
}

export class MapRenderer {
  private bus: EventBus
  private adapter: IMapAdapter
  private config: MapRendererConfig
  private spriteLoader: SpriteLoader
  private vehicles: Map<string, VehicleRenderState> = new Map()
  private vehiclePaths: Map<string, LatLng[]> = new Map()

  constructor(bus: EventBus, adapter: IMapAdapter, config: Partial<MapRendererConfig> = {}) {
    this.bus = bus
    this.adapter = adapter
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.spriteLoader = new SpriteLoader()

    this.bus.on('vehicle:update', (event) => this.handleVehicleUpdate(event.payload))
  }

  private availableAngles: number[] = [0,5,10,15,20,25,30,35,40,45,50,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,310,315,320,325,330,335,340,345,350,355]
  private colorVariants: string[] = ['red_360', 'blue_360', 'green_360', 'yellow_360']

  async initialize(): Promise<void> {
    const spriteUrls: string[] = []
    for (const color of this.colorVariants) {
      const urls = this.availableAngles.map(angle =>
        `images/trucks/${color}/${angle}.png`
      )
      spriteUrls.push(...urls)
    }

    console.log('[MapRenderer]', 'Loading', spriteUrls.length, 'sprites...')
    await this.spriteLoader.loadAll(spriteUrls)
    const cached = this.spriteLoader.getCacheSize()
    console.log('[MapRenderer]', 'Loaded', cached, 'sprites')
  }

  addVehicle(id: string, path: LatLng[], spriteBasePath?: string): void {
    console.log('[MapRenderer]', 'Adding vehicle', id, 'with', path.length, 'points')
    this.vehiclePaths.set(id, path)
    const vehicleSpritePath = spriteBasePath || this.config.spriteBasePath

    // Extract color from spriteBasePath (e.g., 'images/trucks/red_360' -> '#FF0000')
    const color = this.getColorFromPath(vehicleSpritePath)

    const fullPath = this.adapter.createPolyline({
      path,
      strokeColor: color,
      strokeWeight: this.config.strokeWidth,
      strokeOpacity: 0.6,
    })

    const traveledPath = this.adapter.createPolyline({
      path: [path[0]],
      strokeColor: '#FFFFFF',
      strokeWeight: this.config.strokeWidth,
      strokeOpacity: 1,
    })

    const initialSprite = `${vehicleSpritePath}/0.png`
    const image = this.spriteLoader.getCached(initialSprite)
    if (!image) throw new Error(`Sprite not loaded: ${initialSprite}`)

    const canvas = document.createElement('canvas')
    canvas.width = this.config.vehicleSize
    canvas.height = this.config.vehicleSize
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const marker = this.adapter.createMarker({
      position: path[0],
      icon: canvas,
      title: id,
    })

    this.vehicles.set(id, {
      marker,
      traveledPath,
      fullPath,
      lastBearing: 0,
      spriteBasePath: vehicleSpritePath,
    })
  }

  private getColorFromPath(spriteBasePath: string): string {
    if (spriteBasePath.includes('blue_360')) return '#0000FF'
    if (spriteBasePath.includes('green_360')) return '#00FF00'
    if (spriteBasePath.includes('yellow_360')) return '#FFFF00'
    return '#FF0000' // default red
  }

  private handleVehicleUpdate(payload: Record<string, unknown>): void {
    const vehicleId = payload.vehicleId as string
    const position = payload.position as LatLng
    const bearing = payload.bearing as number
    const distanceTraveled = payload.distanceTraveled as number
    const status = payload.status as string

    console.log('[MapRenderer]', 'Handling update for', vehicleId, 'status:', status)

    const state = this.vehicles.get(vehicleId)
    const path = this.vehiclePaths.get(vehicleId)
    if (!state || !path) {
      console.warn('[MapRenderer]', 'Vehicle', vehicleId, 'not found in renderer')
      return
    }

    state.marker.setPosition(position)
    console.log('[MapRenderer]', 'Updated position for', vehicleId)

    const roundedBearing = Math.round(bearing / 5) * 5 % 360
    if (roundedBearing !== state.lastBearing) {
      const spriteUrl = getSpriteUrl(roundedBearing, state.spriteBasePath)
      const image = this.spriteLoader.getCached(spriteUrl)
      if (image) {
        const canvas = document.createElement('canvas')
        canvas.width = this.config.vehicleSize
        canvas.height = this.config.vehicleSize
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const icon = canvas.toDataURL()
        state.marker.setIcon(icon)
        console.log('[MapRenderer]', 'Updated sprite for', vehicleId, 'bearing:', roundedBearing)
      }
      state.lastBearing = roundedBearing
    }

    if (distanceTraveled !== undefined) {
      const traveledPath = this.getPointsAtDistance(path, distanceTraveled)
      state.traveledPath.setPath(traveledPath)
    }

    if (status === 'arrived') {
      console.log('[MapRenderer]', 'Vehicle', vehicleId, 'arrived')
    }
  }

  private getPointsAtDistance(path: LatLng[], distanceMeters: number): LatLng[] {
    if (path.length < 2) return path

    const result: LatLng[] = [path[0]]
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
        result.push(point)
        return result
      }

      result.push(path[i + 1])
      traveled += segmentDist
    }

    return result
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

  handleFitBounds(points: LatLng[]): void {
    this.adapter.fitBounds(points)
  }
}
