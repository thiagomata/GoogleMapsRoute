import type { LatLng } from '../core/geometry'
import {
  type IMapAdapter,
  type MapMarker,
  type MapPolyline,
  type ViewportUpdate,
} from './map-adapter'

class GoogleMarker implements MapMarker {
  private marker: google.maps.Marker

  constructor(options: { position: LatLng; icon?: string | HTMLCanvasElement; title?: string }, map: google.maps.Map) {
    const iconUrl = options.icon
      ? (options.icon instanceof HTMLCanvasElement ? options.icon.toDataURL() : options.icon)
      : undefined

    this.marker = new google.maps.Marker({
      position: options.position,
      icon: iconUrl ? { url: iconUrl as string, scaledSize: new google.maps.Size(64, 64), anchor: new google.maps.Point(32, 52) } : undefined,
      title: options.title,
      map,
    })
  }

  setPosition(position: LatLng): void {
    this.marker.setPosition(position)
  }

  setIcon(icon: string): void {
    this.marker.setIcon({ url: icon, scaledSize: new google.maps.Size(64, 64), anchor: new google.maps.Point(32, 52) })
  }

  setVisible(visible: boolean): void {
    this.marker.setVisible(visible)
  }

  remove(): void {
    this.marker.setMap(null)
  }
}

class GooglePolyline implements MapPolyline {
  private polyline: google.maps.Polyline

  constructor(
    options: { path: LatLng[]; strokeColor: string; strokeWeight: number; strokeOpacity: number; zIndex?: number },
    map: google.maps.Map,
  ) {
    this.polyline = new google.maps.Polyline({
      path: options.path.map((p) => new google.maps.LatLng(p.lat, p.lng)),
      strokeColor: options.strokeColor,
      strokeWeight: options.strokeWeight,
      strokeOpacity: options.strokeOpacity,
      zIndex: options.zIndex,
      map,
    })
  }

  setPath(path: LatLng[]): void {
    this.polyline.setPath(path.map((p) => new google.maps.LatLng(p.lat, p.lng)))
  }

  setMap(_map: unknown): void {
    this.polyline.setMap(null)
  }
}

export class GoogleMapsAdapter implements IMapAdapter {
  private map: google.maps.Map | null = null

  createMap(options: { center: LatLng; zoom: number }): void {
    const container = document.getElementById('map')
    if (!container) {
      throw new Error('Map container #map not found')
    }

    this.map = new google.maps.Map(container, {
      center: options.center,
      zoom: options.zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ],
    })
  }

  getMap(): unknown {
    if (!this.map) throw new Error('Map not initialized. Call createMap() first.')
    return this.map
  }

  createMarker(options: { position: LatLng; icon?: string | HTMLCanvasElement; title?: string }): MapMarker {
    if (!this.map) throw new Error('Map not initialized')
    console.log('[GoogleMapsAdapter]', 'Creating marker at', options.position, 'title:', options.title)
    return new GoogleMarker(options, this.map)
  }

  createPolyline(options: { path: LatLng[]; strokeColor: string; strokeWeight: number; strokeOpacity: number; zIndex?: number }): MapPolyline {
    if (!this.map) throw new Error('Map not initialized')
    console.log('[GoogleMapsAdapter]', 'Creating polyline with', options.path.length, 'points, color:', options.strokeColor)
    return new GooglePolyline(options, this.map)
  }

  setViewport(viewport: ViewportUpdate): void {
    if (!this.map) return
    console.log('[GoogleMapsAdapter]', 'Setting viewport to', viewport.center, 'zoom:', viewport.zoom)
    this.map.panTo(viewport.center)
    this.map.setZoom(viewport.zoom)
  }

  fitBounds(points: LatLng[]): void {
    if (!this.map || points.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend(p))
    this.map.fitBounds(bounds)
  }
}
