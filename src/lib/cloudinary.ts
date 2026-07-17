import { Readable } from 'node:stream'
import { v2 as cloudinary } from 'cloudinary'

export function configureCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  return cloudinary
}

function uploadBuffer(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<{ secure_url: string; public_id: string }> {
  const client = configureCloudinary()
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(options, (err, result) => {
      if (err || !result?.secure_url) {
        reject(err ?? new Error('Cloudinary upload failed'))
        return
      }
      resolve({ secure_url: result.secure_url, public_id: result.public_id })
    })
    Readable.from(buffer).pipe(stream)
  })
}

export async function uploadProfileAvatar(params: {
  userId: string
  dataUri: string
}): Promise<{ url: string; publicId: string }> {
  const client = configureCloudinary()
  const result = await client.uploader.upload(params.dataUri, {
    folder: 'gymtrack/avatars',
    public_id: params.userId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    transformation: [
      { width: 512, height: 512, crop: 'fill', gravity: 'auto', quality: 'auto' },
    ],
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
  }
}

export async function uploadExerciseMedia(params: {
  userId: string
  exerciseKey: string
  buffer: Buffer
  kind: 'image' | 'video'
}): Promise<{ url: string; publicId: string }> {
  const folder = `gymtrack/exercises/${params.userId}`
  const publicId = `${params.exerciseKey}-${params.kind}`

  if (params.kind === 'image') {
    const result = await uploadBuffer(params.buffer, {
      folder,
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    })
    return { url: result.secure_url, publicId: result.public_id }
  }

  const result = await uploadBuffer(params.buffer, {
    folder,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'video',
  })

  return { url: result.secure_url, publicId: result.public_id }
}

export async function uploadMealPhoto(params: {
  userId: string
  mealKey: string
  buffer: Buffer
}): Promise<{ url: string; publicId: string }> {
  const folder = `gymtrack/meals/${params.userId}`
  const publicId = params.mealKey

  const result = await uploadBuffer(params.buffer, {
    folder,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  })

  return { url: result.secure_url, publicId: result.public_id }
}
