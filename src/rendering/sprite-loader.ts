export class SpriteLoader {
  private cache: Map<string, HTMLImageElement> = new Map()

  async load(url: string): Promise<HTMLImageElement | null> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        this.cache.set(url, img)
        resolve(img)
      }
      img.onerror = () => {
        console.warn(`SpriteLoader: failed to load ${url}`)
        resolve(null)
      }
      img.src = url
    })
  }

  async loadAll(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.load(url)))
  }

  getCached(url: string): HTMLImageElement | undefined {
    return this.cache.get(url)
  }

  getCacheSize(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}
