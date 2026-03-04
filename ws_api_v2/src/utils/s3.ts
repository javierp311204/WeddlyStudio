import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export interface UploadResult {
  url: string;
  thumbnail_url: string;
  key: string;
  thumbnail_key: string;
  file_size: number;
  mime_type: string;
}

/**
 * Sube una foto a S3 y genera un thumbnail automáticamente con sharp.
 * Estructura en el bucket: photos/{weddingId}/{uuid}.webp
 */
export async function uploadToS3(
  buffer: Buffer,
  originalMime: string,
  weddingId: string,
): Promise<UploadResult> {
  const uuid = randomUUID();
  const key = `photos/${weddingId}/${uuid}.webp`;
  const thumbnailKey = `photos/${weddingId}/thumbs/${uuid}.webp`;

  // Convertir a WebP y generar thumbnail con sharp
  const [optimized, thumbnail] = await Promise.all([
    sharp(buffer).webp({ quality: 85 }).toBuffer(),
    sharp(buffer).resize(400, 400, { fit: 'cover' }).webp({ quality: 70 }).toBuffer(),
  ]);

  // Subir original y thumbnail en paralelo
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'max-age=31536000', // 1 año
    })),
    s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: 'image/webp',
      CacheControl: 'max-age=31536000',
    })),
  ]);

  const baseUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com`;

  return {
    url: `${baseUrl}/${key}`,
    thumbnail_url: `${baseUrl}/${thumbnailKey}`,
    key,
    thumbnail_key: thumbnailKey,
    file_size: optimized.length,
    mime_type: 'image/webp',
  };
}

/**
 * Elimina una foto y su thumbnail de S3.
 */
export async function deleteFromS3(key: string, thumbnailKey?: string): Promise<void> {
  const deletes = [
    s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })),
  ];

  if (thumbnailKey) {
    deletes.push(s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbnailKey })));
  }

  await Promise.all(deletes);
}

/**
 * Genera una URL pre-firmada para acceso temporal a una foto privada (opcional).
 * Útil si el bucket no es público.
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Extrae la key S3 a partir de una URL completa.
 * ej: "https://bucket.s3.eu-west-1.amazonaws.com/photos/uuid/file.webp" → "photos/uuid/file.webp"
 */
export function extractKeyFromUrl(url: string): string {
  const baseUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/`;
  return url.replace(baseUrl, '');
}