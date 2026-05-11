import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpriteLoader } from '../../src/rendering/sprite-loader'

describe('SpriteLoader', () => {
  let loader: SpriteLoader

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Image.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement) {
      setTimeout(() => this.onload?.(new Event('load')))
    })
    loader = new SpriteLoader()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads a sprite and caches it', async () => {
    const loadPromise = loader.load('test.png')
    vi.runAllTimers()
    const result = await loadPromise

    expect(result).toBeInstanceOf(HTMLImageElement)
    expect(loader.getCacheSize()).toBe(1)
  })

  it('returns cached image on second load', async () => {
    const first = loader.load('test.png')
    vi.runAllTimers()
    await first

    const secondPromise = loader.load('test.png')
    vi.runAllTimers()
    const second = await secondPromise

    expect(second).toBeDefined()
    expect(loader.getCacheSize()).toBe(1)
  })

  it('returns null on load error', async () => {
    vi.spyOn(Image.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement) {
      setTimeout(() => this.onerror?.(new Event('error')))
    })

    const loadPromise = loader.load('broken.png')
    vi.runAllTimers()
    const result = await loadPromise

    expect(result).toBeNull()
    expect(loader.getCacheSize()).toBe(0)
  })

  it('loads multiple sprites with loadAll', async () => {
    const loadPromise = loader.loadAll(['a.png', 'b.png', 'c.png'])
    vi.runAllTimers()
    await loadPromise

    expect(loader.getCacheSize()).toBe(3)
  })

  it('getCached returns undefined for unknown url', () => {
    expect(loader.getCached('unknown.png')).toBeUndefined()
  })

  it('getCached returns image after load', async () => {
    const loadPromise = loader.load('hello.png')
    vi.runAllTimers()
    await loadPromise

    expect(loader.getCached('hello.png')).toBeInstanceOf(HTMLImageElement)
  })

  it('clear empties the cache', async () => {
    const loadPromise = loader.load('a.png')
    vi.runAllTimers()
    await loadPromise

    expect(loader.getCacheSize()).toBe(1)
    loader.clear()
    expect(loader.getCacheSize()).toBe(0)
  })
})
