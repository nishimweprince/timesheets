import { apiRequest } from './client'

export interface CloudinaryUploadParams {
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  timestamp: number
  signature: string
  uploadUrl: string
}

export interface UploadAuthorizationResponse {
  mediaAssetId: string
  cloudinary: CloudinaryUploadParams
}

export const mediaApi = {
  requestUploadAuth: (originalFilename?: string): Promise<UploadAuthorizationResponse> =>
    apiRequest('/media/upload-authorization', {
      method: 'POST',
      body: originalFilename ? { originalFilename } : {},
    }),

  completeUpload: (mediaAssetId: string, publicId: string): Promise<unknown> =>
    apiRequest(`/media/${mediaAssetId}/complete`, {
      method: 'POST',
      body: { publicId },
    }),
}

export async function uploadToCloudinary(
  params: CloudinaryUploadParams,
  blob: Blob,
  filename: string,
): Promise<void> {
  const fd = new FormData()
  fd.append('file', blob, filename)
  fd.append('api_key', params.apiKey)
  fd.append('public_id', params.publicId)
  fd.append('folder', params.folder)
  fd.append('timestamp', String(params.timestamp))
  fd.append('signature', params.signature)
  const res = await fetch(params.uploadUrl, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Cloudinary upload failed')
}

export async function uploadMediaAsset(blob: Blob, filename: string): Promise<string> {
  const auth = await mediaApi.requestUploadAuth(filename)
  await uploadToCloudinary(auth.cloudinary, blob, filename)
  await mediaApi.completeUpload(auth.mediaAssetId, auth.cloudinary.publicId)
  return auth.mediaAssetId
}
