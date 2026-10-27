/**
 * Downscales the ticket photo in the browser before upload. Phone photos are
 * often 3–8 MB and Vercel caps request bodies at 4.5 MB; a 1600px JPEG of a
 * ticket stays legible at a few hundred KB.
 */
const MAX_SIDE = 1600
const QUALITY = 0.82

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Format the browser can't decode (e.g. HEIC outside Safari) — send as-is, the server validates size.
    return file
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}
