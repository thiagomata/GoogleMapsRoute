import { describe, it, expect } from 'vitest'
import { bearingToSpriteAngle, getSpriteUrl } from '../../src/rendering/sprite-canvas'

describe('bearingToSpriteAngle', () => {
  it('returns exact angle when in available list', () => {
    expect(bearingToSpriteAngle(0)).toBe(0)
    expect(bearingToSpriteAngle(90)).toBe(90)
    expect(bearingToSpriteAngle(270)).toBe(270)
    expect(bearingToSpriteAngle(355)).toBe(355)
  })

  it('maps to nearest available angle', () => {
    expect(bearingToSpriteAngle(5)).toBe(0)
    expect(bearingToSpriteAngle(7)).toBe(0)
    expect(bearingToSpriteAngle(10)).toBe(10)
    expect(bearingToSpriteAngle(85)).toBe(90)
    expect(bearingToSpriteAngle(88)).toBe(90)
    expect(bearingToSpriteAngle(180)).toBe(175)
    expect(bearingToSpriteAngle(185)).toBe(185)
  })

  it('picks first when two available angles are equally close', () => {
    expect(bearingToSpriteAngle(5)).toBe(0)
    expect(bearingToSpriteAngle(355)).toBe(355)
  })

  it('maps angles in sparse regions to the nearest available', () => {
    expect(bearingToSpriteAngle(55)).toBe(50)
    expect(bearingToSpriteAngle(65)).toBe(50)
    expect(bearingToSpriteAngle(275)).toBe(270)
    expect(bearingToSpriteAngle(295)).toBe(310)
    expect(bearingToSpriteAngle(300)).toBe(310)
  })

  it('maps angles just below 360 to the nearest available', () => {
    expect(bearingToSpriteAngle(358)).toBe(0)
    expect(bearingToSpriteAngle(359)).toBe(0)
    expect(bearingToSpriteAngle(362)).toBe(0)
  })

  it('maps angles just above 0 to the nearest available', () => {
    expect(bearingToSpriteAngle(2)).toBe(0)
    expect(bearingToSpriteAngle(8)).toBe(10)
  })

  it('handles negative angles gracefully', () => {
    const result = bearingToSpriteAngle(-90)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(360)
  })
})

describe('getSpriteUrl', () => {
  it('returns URL with default base path', () => {
    const url = getSpriteUrl(0)
    expect(url).toBe('images/trucks/red_360/0.png')
  })

  it('returns URL with custom base path', () => {
    const url = getSpriteUrl(90, 'images/trucks/blue_360')
    expect(url).toBe('images/trucks/blue_360/90.png')
  })

  it('resolves bearing before constructing URL', () => {
    const url = getSpriteUrl(7, 'sprites/cars')
    expect(url).toBe('sprites/cars/0.png')
  })

  it('handles angles near 360', () => {
    const url = getSpriteUrl(359, 'sprites')
    expect(url).toBe('sprites/0.png')
  })
})
