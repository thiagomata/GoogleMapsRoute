import type { LatLng } from '../../src/core/geometry'
import {
  type IMapAdapter,
  type MapMarker,
  type MapPolyline,
  type ViewportUpdate,
} from '../../src/services/map-adapter'

export class MockMapMarker implements MapMarker {
  private _position: LatLng
  private _visible: boolean = true
  private _removed: boolean = false

  constructor(options: { position: LatLng }) {
    this._position = { ...options.position }
  }

  setPosition(position: LatLng): void {
    this._position = { ...position }
  }

  getPosition(): LatLng {
    return { ...this._position }
  }

  setIcon(_icon: string): void {
    // no-op in mock
  }

  setVisible(visible: boolean): void {
    this._visible = visible
  }

  isVisible(): boolean {
    return this._visible
  }

  remove(): void {
    this._removed = true
  }

  isRemoved(): boolean {
    return this._removed
  }
}

export class MockMapPolyline implements MapPolyline {
  private _path: LatLng[]
  private _map: unknown = 'mock-map'

  constructor(options: { path: LatLng[] }) {
    this._path = options.path.map((p) => ({ ...p }))
  }

  setPath(path: LatLng[]): void {
    this._path = path.map((p) => ({ ...p }))
  }

  getPath(): LatLng[] {
    return this._path.map((p) => ({ ...p }))
  }

  setMap(map: unknown): void {
    this._map = map
  }

  getMap(): unknown {
    return this._map
  }
}

export class MockMapAdapter implements IMapAdapter {
  markers: MockMapMarker[] = []
  polylines: MockMapPolyline[] = []
  viewportUpdates: ViewportUpdate[] = []
  fitBoundsCalls: LatLng[][] = []
  private _map: unknown = 'mock-map'

  createMap(_options: { center: LatLng; zoom: number }): void {
    // no-op
  }

  getMap(): unknown {
    return this._map
  }

  createMarker(options: { position: LatLng }): MapMarker {
    const marker = new MockMapMarker(options)
    this.markers.push(marker)
    return marker
  }

  createPolyline(options: { path: LatLng[]; zIndex?: number }): MapPolyline {
    const polyline = new MockMapPolyline(options)
    this.polylines.push(polyline)
    return polyline
  }

  setViewport(viewport: ViewportUpdate): void {
    this.viewportUpdates.push(viewport)
  }

  fitBounds(points: LatLng[]): void {
    this.fitBoundsCalls.push(points)
  }

  clear(): void {
    this.markers = []
    this.polylines = []
    this.viewportUpdates = []
    this.fitBoundsCalls = []
  }
}
