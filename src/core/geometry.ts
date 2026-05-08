export interface LatLng {
  lat: number
  lng: number
}

export interface RouteStep {
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
  instructions: string
}

export interface RawRoute {
  path: LatLng[]
  steps: RouteStep[]
  distanceMeters: number
  durationSeconds: number
}

const POLYLINE_PRECISION = 1e5

export function decodePolyline(encoded: string): LatLng[] {
  const result: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let resultLat = 0
    let shift = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      resultLat |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLat = (resultLat & 1) ? ~(resultLat >> 1) : (resultLat >> 1)
    lat += deltaLat

    let resultLng = 0
    shift = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      resultLng |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLng = (resultLng & 1) ? ~(resultLng >> 1) : (resultLng >> 1)
    lng += deltaLng

    result.push({
      lat: lat / POLYLINE_PRECISION,
      lng: lng / POLYLINE_PRECISION,
    })
  }

  return result
}

export function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function toDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

export function bearing(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function interpolate(from: LatLng, to: LatLng, fraction: number): LatLng {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  }
}

export function pointAtDistance(path: LatLng[], distanceMeters: number): { point: LatLng; bearing: number } | null {
  if (path.length < 2) return null

  let traveled = 0

  for (let i = 0; i < path.length - 1; i++) {
    const segmentDist = haversineDistance(path[i], path[i + 1])

    if (traveled + segmentDist >= distanceMeters) {
      const remaining = distanceMeters - traveled
      const fraction = segmentDist === 0 ? 0 : remaining / segmentDist
      const point = interpolate(path[i], path[i + 1], fraction)
      const brng = bearing(path[i], path[i + 1])
      return { point, bearing: brng }
    }

    traveled += segmentDist
  }

  const last = path[path.length - 1]
  const prev = path[path.length - 2]
  return { point: last, bearing: bearing(prev, last) }
}

export function totalDistance(path: LatLng[]): number {
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineDistance(path[i], path[i + 1])
  }
  return total
}

export function cumulativeDistances(path: LatLng[]): number[] {
  const result: number[] = [0]
  for (let i = 0; i < path.length - 1; i++) {
    result.push(result[result.length - 1] + haversineDistance(path[i], path[i + 1]))
  }
  return result
}

export function splitPathAt(
  path: LatLng[],
  cumDists: number[],
  distanceMeters: number,
  startIndex: number,
): { traveled: LatLng[]; remaining: LatLng[]; splitIndex: number } {
  if (path.length < 2 || distanceMeters <= 0) {
    return { traveled: [path[0]], remaining: [...path], splitIndex: 0 }
  }

  let i = Math.max(0, Math.min(startIndex, cumDists.length - 2))
  for (; i < cumDists.length - 1; i++) {
    if (cumDists[i + 1] >= distanceMeters) break
  }

  if (i >= cumDists.length - 1) {
    for (i = 0; i < cumDists.length - 1; i++) {
      if (cumDists[i + 1] >= distanceMeters) break
    }
    if (i >= cumDists.length - 1) {
      return {
        traveled: [...path],
        remaining: [path[path.length - 1]],
        splitIndex: cumDists.length - 2,
      }
    }
  }

  const segmentLen = cumDists[i + 1] - cumDists[i]
  const fraction = segmentLen === 0 ? 0 : (distanceMeters - cumDists[i]) / segmentLen
  const point = interpolate(path[i], path[i + 1], fraction)
  const traveled = [...path.slice(0, i + 1), point]
  const remaining = fraction >= 1
    ? path.slice(i + 1)
    : [point, ...path.slice(i + 1)]
  return { traveled, remaining, splitIndex: i }
}

export function latLngBounds(points: LatLng[]): { center: LatLng; zoom: number } | null {
  if (points.length === 0) return null

  const minLat = Math.min(...points.map((p) => p.lat))
  const maxLat = Math.max(...points.map((p) => p.lat))
  const minLng = Math.min(...points.map((p) => p.lng))
  const maxLng = Math.max(...points.map((p) => p.lng))

  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  }

  const latSpan = maxLat - minLat
  const lngSpan = maxLng - minLng

  const maxSpan = Math.max(latSpan, lngSpan)
  const zoom = maxSpan === 0 ? 15 : Math.floor(Math.log2(360 / maxSpan)) - 1

  return { center, zoom: Math.max(1, Math.min(20, zoom)) }
}
