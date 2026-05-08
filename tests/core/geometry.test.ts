import { describe, it, expect } from 'vitest'
import {
  decodePolyline,
  bearing,
  haversineDistance,
  interpolate,
  pointAtDistance,
  totalDistance,
  cumulativeDistances,
  splitPathAt,
  latLngBounds,
} from '../../src/core/geometry'
import type { LatLng } from '../../src/core/geometry'

describe('decodePolyline', () => {
  it('decodes a simple polyline', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
    const result = decodePolyline(encoded)

    expect(result.length).toBe(3)
    expect(result[0]).toEqual({ lat: 38.5, lng: -120.2 })
    expect(result[1]).toEqual({ lat: 40.7, lng: -120.95 })
    expect(result[2]).toEqual({ lat: 43.252, lng: -126.453 })
  })

  it('decodes a two-point polyline', () => {
    const encoded = 'w`oeF~nbjO}A_A'
    const result = decodePolyline(encoded)

    expect(result.length).toBe(2)
  })
})

describe('bearing', () => {
  it('returns 0 for northward movement', () => {
    const from: LatLng = { lat: 0, lng: 0 }
    const to: LatLng = { lat: 1, lng: 0 }
    expect(bearing(from, to)).toBeCloseTo(0, 0)
  })

  it('returns 90 for eastward movement', () => {
    const from: LatLng = { lat: 0, lng: 0 }
    const to: LatLng = { lat: 0, lng: 1 }
    expect(bearing(from, to)).toBeCloseTo(90, 0)
  })

  it('returns 180 for southward movement', () => {
    const from: LatLng = { lat: 1, lng: 0 }
    const to: LatLng = { lat: 0, lng: 0 }
    expect(bearing(from, to)).toBeCloseTo(180, 0)
  })

  it('returns 270 for westward movement', () => {
    const from: LatLng = { lat: 0, lng: 1 }
    const to: LatLng = { lat: 0, lng: 0 }
    expect(bearing(from, to)).toBeCloseTo(270, 0)
  })
})

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const point: LatLng = { lat: 0, lng: 0 }
    expect(haversineDistance(point, point)).toBe(0)
  })

  it('returns approximately correct distance', () => {
    const sydney: LatLng = { lat: -33.8688, lng: 151.2093 }
    const melbourne: LatLng = { lat: -37.8136, lng: 144.9631 }
    const dist = haversineDistance(sydney, melbourne)
    expect(dist).toBeGreaterThan(700000)
    expect(dist).toBeLessThan(750000)
  })
})

describe('interpolate', () => {
  it('returns start point at fraction 0', () => {
    const a: LatLng = { lat: 0, lng: 0 }
    const b: LatLng = { lat: 10, lng: 10 }
    expect(interpolate(a, b, 0)).toEqual({ lat: 0, lng: 0 })
  })

  it('returns end point at fraction 1', () => {
    const a: LatLng = { lat: 0, lng: 0 }
    const b: LatLng = { lat: 10, lng: 10 }
    expect(interpolate(a, b, 1)).toEqual({ lat: 10, lng: 10 })
  })

  it('returns midpoint at fraction 0.5', () => {
    const a: LatLng = { lat: 0, lng: 0 }
    const b: LatLng = { lat: 10, lng: 10 }
    expect(interpolate(a, b, 0.5)).toEqual({ lat: 5, lng: 5 })
  })
})

describe('pointAtDistance', () => {
  it('returns null for single-point path', () => {
    const path: LatLng[] = [{ lat: 0, lng: 0 }]
    expect(pointAtDistance(path, 0)).toBeNull()
  })

  it('returns start point at distance 0', () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
    ]
    const result = pointAtDistance(path, 0)
    expect(result).not.toBeNull()
    expect(result!.point.lat).toBe(0)
    expect(result!.point.lng).toBe(0)
  })
})

describe('totalDistance', () => {
  it('returns 0 for single-point path', () => {
    const path: LatLng[] = [{ lat: 0, lng: 0 }]
    expect(totalDistance(path)).toBe(0)
  })

  it('returns sum of segment distances', () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]
    const d1 = haversineDistance(path[0], path[1])
    const d2 = haversineDistance(path[1], path[2])
    expect(totalDistance(path)).toBeCloseTo(d1 + d2, 0)
  })
})

describe('cumulativeDistances', () => {
  it('returns [0] for single-point path', () => {
    expect(cumulativeDistances([{ lat: 0, lng: 0 }])).toEqual([0])
  })

  it('returns correct distances for multi-point path', () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]
    const d1 = haversineDistance(path[0], path[1])
    const d2 = haversineDistance(path[1], path[2])
    const result = cumulativeDistances(path)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe(0)
    expect(result[1]).toBeCloseTo(d1, 0)
    expect(result[2]).toBeCloseTo(d1 + d2, 0)
  })
})

describe('splitPathAt', () => {
  const path: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 0, lng: 2 },
  ]
  const cumDists = cumulativeDistances(path)

  it('returns full path as remaining at distance 0', () => {
    const result = splitPathAt(path, cumDists, 0, 0)
    expect(result.traveled).toHaveLength(1)
    expect(result.traveled[0]).toEqual({ lat: 0, lng: 0 })
    expect(result.remaining).toHaveLength(3)
    expect(result.splitIndex).toBe(0)
  })

  it('splits at midpoint', () => {
    const halfTotal = cumDists[2] / 2
    const result = splitPathAt(path, cumDists, halfTotal, 0)
    expect(result.traveled.length).toBeGreaterThan(1)
    expect(result.remaining.length).toBeGreaterThan(1)
    expect(result.traveled[result.traveled.length - 1]).toEqual(result.remaining[0])
  })

  it('returns full path as traveled at total distance', () => {
    const result = splitPathAt(path, cumDists, cumDists[2], 0)
    expect(result.traveled).toHaveLength(3)
    expect(result.remaining).toHaveLength(1)
    expect(result.remaining[0]).toEqual(path[2])
  })

  it('walks forward from startIndex', () => {
    const result = splitPathAt(path, cumDists, cumDists[1], 0)
    expect(result.splitIndex).toBe(0)
    const result2 = splitPathAt(path, cumDists, cumDists[1] + 1, result.splitIndex)
    expect(result2.splitIndex).toBeGreaterThanOrEqual(0)
  })

  it('handles single-point path', () => {
    const single: LatLng[] = [{ lat: 1, lng: 1 }]
    const result = splitPathAt(single, [0], 0, 0)
    expect(result.traveled).toHaveLength(1)
    expect(result.remaining).toHaveLength(1)
  })
})

describe('latLngBounds', () => {
  it('returns null for empty array', () => {
    expect(latLngBounds([])).toBeNull()
  })

  it('calculates center and zoom for multiple points', () => {
    const points: LatLng[] = [
      { lat: -33.9, lng: 151.1 },
      { lat: -33.8, lng: 151.3 },
    ]
    const result = latLngBounds(points)
    expect(result).not.toBeNull()
    expect(result!.center.lat).toBeCloseTo(-33.85, 2)
    expect(result!.center.lng).toBeCloseTo(151.2, 1)
    expect(result!.zoom).toBeGreaterThan(0)
    expect(result!.zoom).toBeLessThan(21)
  })

  it('clamps zoom to valid range', () => {
    const points: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0.00001, lng: 0.00001 },
    ]
    const result = latLngBounds(points)
    expect(result!.zoom).toBeGreaterThanOrEqual(1)
    expect(result!.zoom).toBeLessThanOrEqual(20)
  })
})
