import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../../env.js';

export const s3 = new S3Client({
  endpoint: `${env.MINIO_USE_SSL ? 'https' : 'http'}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
  }
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getFile(key: string) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );
  return response;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );
}

export async function checkStorageHealth(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
    return true;
  } catch {
    return false;
  }
}
