import { Queue } from "bullmq";
import { bullRedisConnection } from "../config/bullRedis.js";

export const IMAGE_PROCESSING_QUEUE_NAME = "imageProcessingQueue";
export const IMAGE_PROCESSING_DLQ_NAME = "imageProcessingDeadLetterQueue";

export interface ImageProcessingJobMetadata {
  itemCategory?: string;
  createdBy?: string;
  source?: string;
  [key: string]: unknown;
}

export interface ImageProcessingJobData {
  itemId: string;
  itemName: string;
  medicineStoreId: string;
  images: {
    originalName: string;
    mimeType: string;
    size: number;
    imageBufferBase64: string;
  }[];
  metadata?: ImageProcessingJobMetadata;
  requestedAt: string;
}

export interface ImageProcessingJobResult {
  itemId: string;
  processedImageUrls: string[];
  skipped?: boolean;
}

export interface ImageProcessingDeadLetterJobData extends ImageProcessingJobData {
  failedReason: string;
  failedAt: string;
  jobId: string;
  attemptsMade: number;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

export const imageProcessingQueue = new Queue<ImageProcessingJobData, ImageProcessingJobResult, string>(
  IMAGE_PROCESSING_QUEUE_NAME,
  {
    connection: bullRedisConnection,
    defaultJobOptions,
  }
);

export const imageProcessingDeadLetterQueue = new Queue<
  ImageProcessingDeadLetterJobData,
  ImageProcessingDeadLetterJobData,
  string
>(IMAGE_PROCESSING_DLQ_NAME, {
  connection: bullRedisConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});
