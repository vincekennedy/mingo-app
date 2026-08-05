/** Client-side JPEG compress for scavenger cell proofs (keep free-tier storage small). */

export const PROOF_MAX_EDGE_PX = 1280
export const PROOF_JPEG_QUALITY = 0.72
export const PROOF_MAX_BYTES = 400 * 1024

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode JPEG'))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Resize and encode to JPEG under PROOF_MAX_BYTES when possible.
 */
export async function compressImageForProof(file: File | Blob): Promise<File> {
  if (!file.type.startsWith('image/') && !(file instanceof File && file.name)) {
    throw new Error('File must be an image')
  }

  const img = await loadImageFromBlob(file)
  let { width, height } = img
  const maxEdge = Math.max(width, height)
  if (maxEdge > PROOF_MAX_EDGE_PX) {
    const scale = PROOF_MAX_EDGE_PX / maxEdge
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = PROOF_JPEG_QUALITY
  let blob = await canvasToJpegBlob(canvas, quality)
  while (blob.size > PROOF_MAX_BYTES && quality > 0.4) {
    quality -= 0.08
    blob = await canvasToJpegBlob(canvas, quality)
  }

  if (blob.size > PROOF_MAX_BYTES * 1.5) {
    throw new Error('Photo is still too large after compression. Try a smaller image.')
  }

  const name =
    file instanceof File && file.name
      ? file.name.replace(/\.[^.]+$/, '') + '.jpg'
      : `proof-${Date.now()}.jpg`

  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}
