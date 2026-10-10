export async function uploadToCloudinary(file, resourceType = 'image') {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = resourceType === 'audio'
    ? import.meta.env.VITE_CLOUDINARY_AUDIO_UPLOAD_PRESET || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    : import.meta.env.VITE_CLOUDINARY_IMAGE_UPLOAD_PRESET || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Set its cloud name and unsigned upload preset.');
  }
  if (!(file instanceof Blob)) {
    throw new TypeError('Cloudinary uploads require a File or Blob.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);

  const cloudinaryResourceType = resourceType === 'audio' ? 'video' : resourceType;
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${encodeURIComponent(cloudinaryResourceType)}/upload`,
    { method: 'POST', body },
  );
  const payload = await response.json();
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || `Cloudinary upload failed (${response.status}).`);
  }
  return payload.secure_url;
}
