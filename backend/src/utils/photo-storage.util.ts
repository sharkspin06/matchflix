import path from 'path';
import supabase from '../config/supabase.config';

const PHOTO_BUCKET = 'photos';
const storage = supabase.storage.from(PHOTO_BUCKET);
const PUBLIC_URL_PREFIX = storage.getPublicUrl('').data.publicUrl;
const UPLOAD_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;

/**
 * Upload a photo to Supabase Storage
 * @param file - The file received by the upload middleware
 * @param folder - Where in the bucket to put it (profile photos by default, or e.g. a chat's folder)
 * @returns The photo's public URL
 */
export const savePhoto = async (file: Express.Multer.File, folder = 'profiles'): Promise<string> => {
  const extension = path.extname(file.originalname).toLowerCase();
  const filePath = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

  for (let attempt = 1; ; attempt++) {
    // upsert keeps a retry safe if an earlier attempt landed but its response was lost
    const { error } = await storage.upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

    if (!error) {
      return storage.getPublicUrl(filePath).data.publicUrl;
    }

    // Only connection failures have no HTTP status; a rejection from Supabase won't change on retry
    const isConnectionFailure = (error as any).status === undefined && (error as any).statusCode === undefined;
    if (!isConnectionFailure || attempt >= UPLOAD_ATTEMPTS) {
      throw error;
    }

    console.warn(`Photo upload attempt ${attempt} could not connect, retrying`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
};

/**
 * Checks the file's first bytes, since the name and type a client sends can be faked.
 * Accepts the same formats as the upload middleware: JPEG, PNG, GIF and WebP.
 */
export const isRealImage = (buffer: Buffer): boolean => {
  if (buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const gif = buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return jpeg || png || gif || webp;
};

/**
 * Remove a photo from Supabase Storage. URLs stored elsewhere are ignored, and
 * a failure is only logged so it can't block the profile change that triggered it.
 * @param photoUrl - The photo's public URL
 */
export const removeStoredPhoto = async (photoUrl: string): Promise<void> => {
  if (!photoUrl.startsWith(PUBLIC_URL_PREFIX)) {
    return;
  }

  const { error } = await storage.remove([photoUrl.slice(PUBLIC_URL_PREFIX.length)]);

  if (error) {
    console.error('Failed to delete photo from storage:', error);
  }
};
