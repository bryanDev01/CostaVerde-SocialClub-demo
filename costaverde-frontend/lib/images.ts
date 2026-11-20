const MAX_OUTPUT_PX = 320
const JPEG_QUALITY = 0.85
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateProfileImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Formato no soportado. Usa JPG, PNG o WebP.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'La imagen no puede superar los 5 MB.'
  }
  return null
}

export function resizeProfileImage(
  file: File,
  maxPx: number = MAX_OUTPUT_PX,
  quality: number = JPEG_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, maxPx / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('No se pudo procesar la imagen'))
        return
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen'))
    }

    image.src = objectUrl
  })
}
