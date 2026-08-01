const DEFAULT_MAX_BYTES = 360 * 1024;
const DEFAULT_MAX_DIMENSION = 1600;

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Browser gagal mengompres gambar.'))),
      type,
      quality,
    );
  });
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Safari can decode some formats through an image element but not createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressUploadImage(file, {
  maxBytes = DEFAULT_MAX_BYTES,
  maxDimension = DEFAULT_MAX_DIMENSION,
} = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('File harus berupa gambar.');
  const source = await decodeImage(file);
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) throw new Error(`Gambar ${file.name} tidak dapat dibaca.`);

  let scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  let quality = 0.82;
  let result;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Browser tidak mendukung kompresi gambar.');

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      context.fillStyle = '#111318';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      result = await canvasBlob(canvas, 'image/webp', quality);
      if (result.size <= maxBytes) break;
      if (quality > 0.58) quality -= 0.08;
      else {
        scale *= 0.84;
        quality = 0.74;
      }
    }
  } finally {
    if (typeof source.close === 'function') source.close();
  }

  if (!result || result.size > maxBytes) {
    throw new Error(`Gambar ${file.name} masih terlalu besar setelah dikompres.`);
  }
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'gambar';
  return new File([result], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: file.lastModified || Date.now(),
  });
}

export const uploadImageLimits = {
  maxSourceBytes: 25 * 1024 * 1024,
  maxTotalBytes: 4_000_000,
};
