import sharp from 'sharp';
import { BadRequestError } from './errors.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

/**
 * Strip EXIF metadata (GPS, camera serial, datetime) from image buffers.
 * Pass-through for non-image mimetypes.
 * Throws BadRequestError for unsupported image types.
 */
export async function stripExif(buffer: Buffer, mimetype: string): Promise<Buffer> {
  if (!mimetype.startsWith('image/')) {
    return buffer;
  }

  if (!ALLOWED_IMAGE_TYPES.has(mimetype)) {
    throw new BadRequestError(`Unsupported image type: ${mimetype}. Allowed: jpeg, png, heic`);
  }

  // rotate() applies EXIF orientation then strips it; withMetadata({ exif: {} }) removes all EXIF
  return sharp(buffer)
    .rotate()
    .withMetadata({ exif: {} })
    .toBuffer();
}
