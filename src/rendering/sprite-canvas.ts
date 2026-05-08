export function createVehicleCanvas(image: HTMLImageElement, size: number = 64): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.clearRect(0, 0, size, size)

  const aspectRatio = image.width / image.height
  const drawWidth = aspectRatio > 1 ? size : size * aspectRatio
  const drawHeight = aspectRatio > 1 ? size / aspectRatio : size
  const offsetX = (size - drawWidth) / 2
  const offsetY = (size - drawHeight) / 2

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

  return canvas
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

const AVAILABLE_ANGLES = [0,10,15,20,25,30,35,40,45,50,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,310,315,320,325,330,335,340,345,350,355]

export function bearingToSpriteAngle(bearing: number): number {
  const rounded = Math.round(bearing / 5) * 5 % 360
  let closest = AVAILABLE_ANGLES[0]
  let minDiff = 360
  for (const angle of AVAILABLE_ANGLES) {
    const diff = Math.abs(angle - rounded)
    if (diff < minDiff) {
      minDiff = diff
      closest = angle
    }
    if (diff === 0) break
  }
  return closest
}

export function getSpriteUrl(bearing: number, basePath: string = 'images/trucks/red_360'): string {
  const angle = bearingToSpriteAngle(bearing)
  return `${basePath}/${angle}.png`
}
