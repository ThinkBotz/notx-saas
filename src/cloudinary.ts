export const uploadToCloudinary = async (file: File, uploadPresetOverride?: string): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = uploadPresetOverride || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Validate allowed image MIME types
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Only JPEG, PNG, WebP, GIF, and SVG images are permitted.`);
  }

  // Enforce 10MB maximum file size limit
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed limit of 10MB.`);
  }

  if (!cloudName || !uploadPreset || uploadPreset.trim() === '' || uploadPreset.includes('your_unsigned_upload_preset_here')) {
    throw new Error('Please configure a valid Unsigned Upload Preset in .env (VITE_CLOUDINARY_UPLOAD_PRESET)');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset.trim());

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errMsg = errorData.error?.message || 'Failed to upload image to Cloudinary';
    const lower = errMsg.toLowerCase();
    if (lower.includes('unsigned') || lower.includes('unknown api key') || lower.includes('must supply api_key') || lower.includes('preset')) {
      errMsg = 'Cloudinary error: Ensure "' + uploadPreset.trim() + '" exists as an "Unsigned" upload preset in your Cloudinary console for cloud "' + cloudName.trim() + '".';
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return getOptimizedImageUrl(data.secure_url);
};

/**
 * Automatically optimizes Cloudinary image URLs for high performance (WebP/AVIF format and auto-compression).
 */
export const getOptimizedImageUrl = (url: string, width?: number): string => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || url.includes('f_auto')) return url;
  
  const transformation = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
  return url.replace('/upload/', `/upload/${transformation}/`);
};
