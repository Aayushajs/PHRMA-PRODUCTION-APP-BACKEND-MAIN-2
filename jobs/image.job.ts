import { imageProcessingQueue, type ImageProcessingJobMetadata } from "../queues/image.queue.js";

export interface EnqueueImageProcessingJobInput {
  itemId: string;
  itemName: string;
  medicineStoreId: string;
  files: Express.Multer.File[];
  metadata?: ImageProcessingJobMetadata;
}

export interface EnqueueImageProcessingJobResult {
  jobId: string;
  queueJobId: string;
  imageCount: number;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? 10 * 1024 * 1024);

export async function enqueueImageProcessingJob(
  input: EnqueueImageProcessingJobInput
): Promise<EnqueueImageProcessingJobResult> {
  const serializedImages = input.files.map((file) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      throw new Error(`Unsupported image mimetype: ${file.mimetype}`);
    }

    if (!file.size || file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image size exceeds allowed limit for file: ${file.originalname}`);
    }

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      imageBufferBase64: file.buffer.toString("base64"),
    };
  });

  const queueJobId = `image-processing-${input.itemId}`;

  await imageProcessingQueue.add(
    "remove-background",
    {
      itemId: input.itemId,
      itemName: input.itemName,
      medicineStoreId: input.medicineStoreId,
      images: serializedImages,
      metadata: input.metadata,
      requestedAt: new Date().toISOString(),
    },
    {
      jobId: queueJobId,
    }
  );

  return {
    jobId: queueJobId,
    queueJobId,
    imageCount: serializedImages.length,
  };
}
