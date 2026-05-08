import type { LatLng } from '../core/geometry'

export interface MapMarker {
  setPosition(position: LatLng): void
  setIcon(icon: string): void
  setVisible(visible: boolean): void
  remove(): void
}

export interface MapPolyline {
  setPath(path: LatLng[]): void
  setMap(map: unknown): void
}

export interface ViewportUpdate {
  center: LatLng
  zoom: number
}

export interface IMapAdapter {
  createMap(options: { center: LatLng; zoom: number }): void
  getMap(): unknown

  createMarker(options: {
    position: LatLng
    icon?: string | HTMLCanvasElement
    title?: string
  }): MapMarker

  createPolyline(options: {
    path: LatLng[]
    strokeColor: string
    strokeWeight: number
    strokeOpacity: number
  }): MapPolyline

  setViewport(viewport: ViewportUpdate): void

  fitBounds(points: LatLng[]): void
}
