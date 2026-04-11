import { Job, Worker } from "bullmq";
import ItemModel from "../Databases/Models/item.Model.js";
import { closeBullRedis, connectBullRedis, bullRedisConnection } from "../config/bullRedis.js";
import {
  imageProcessingDeadLetterQueue,
  IMAGE_PROCESSING_QUEUE_NAME,
  type ImageProcessingJobData,
  type ImageProcessingJobResult,
} from "../queues/image.queue.js";
import { BgRemovalService } from "../Services/bgRemoval.service.js";
import { CloudinaryService } from "../Services/cloudinary.service.js";

let activeWorker: Worker<ImageProcessingJobData, ImageProcessingJobResult, string> | null = null;

function logImageWorker(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      level: payload.level ?? "info",
      service: "image-worker",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
}

async function processImageJob(job: Job<ImageProcessingJobData, ImageProcessingJobResult, string>): Promise<ImageProcessingJobResult> {
  const { itemId, itemName, medicineStoreId, images } = job.data;

  await job.updateProgress(0);
  logImageWorker("job.started", {
    jobId: job.id,
    itemId,
    itemName,
    medicineStoreId,
    attempt: job.attemptsMade + 1,
  });

  const existingItem = await ItemModel.findById(itemId).select("itemImages imageProcessingStatus").lean();

  const alreadyProcessed =
    existingItem?.imageProcessingStatus === "completed" &&
    Array.isArray(existingItem?.itemImages) &&
    existingItem.itemImages.length > 0;

  if (alreadyProcessed) {
    const imageUrls = Array.isArray(existingItem?.itemImages) ? existingItem?.itemImages ?? [] : [];

    await job.updateProgress(100);

    logImageWorker("job.skipped", {
      jobId: job.id,
      itemId,
      reason: "already_processed",
      processedImageCount: imageUrls.length,
    });

    return {
      itemId,
      processedImageUrls: imageUrls,
      skipped: true,
    };
  }

  await ItemModel.findByIdAndUpdate(itemId, {
    imageProcessingStatus: "processing",
    imageProcessingJobId: String(job.id ?? itemId),
    imageProcessingError: null,
    imageProcessingImageCount: images.length,
    imageProcessingUpdatedAt: new Date(),
    updatedAt: new Date(),
  });

  const processedImageUrls: string[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];

    if (!image) {
      continue;
    }

    const progressBase = Math.floor((index / Math.max(images.length, 1)) * 80);
    await job.updateProgress(progressBase);

    logImageWorker("image.processing", {
      jobId: job.id,
      itemId,
      itemName,
      imageIndex: index,
      originalName: image.originalName,
    });

    const rawImageBuffer = Buffer.from(image.imageBufferBase64, "base64");
    const processedBuffer = await BgRemovalService.removeBackground({
      imageBuffer: rawImageBuffer,
      mimeType: image.mimeType,
      fileName: image.originalName,
    });
    const secureUrl = await CloudinaryService.uploadProcessedItemImage(processedBuffer, itemId, index);
    processedImageUrls.push(secureUrl);

    await job.updateProgress(Math.min(95, progressBase + Math.ceil(80 / Math.max(images.length, 1))));
  }

  await ItemModel.findByIdAndUpdate(itemId, {
    itemImages: processedImageUrls,
    imageProcessingStatus: "completed",
    imageProcessingJobId: String(job.id ?? itemId),
    imageProcessingError: null,
    imageProcessingImageCount: processedImageUrls.length,
    imageProcessingUpdatedAt: new Date(),
    updatedAt: new Date(),
  });
  await job.updateProgress(100);

  logImageWorker("job.completed", {
    jobId: job.id,
    itemId,
    itemName,
    processedImageCount: processedImageUrls.length,
  });

  return {
    itemId,
    processedImageUrls,
  };
}

export async function startImageWorker(): Promise<void> {
  if (activeWorker) {
    return;
  }

  await connectBullRedis();

  const concurrency = Math.max(1, Number(process.env.IMAGE_PROCESSING_CONCURRENCY ?? 3));

  activeWorker = new Worker<ImageProcessingJobData, ImageProcessingJobResult, string>(
    IMAGE_PROCESSING_QUEUE_NAME,
    processImageJob,
    {
      connection: bullRedisConnection,
      concurrency,
    }
  );

  activeWorker.on("progress", (job, progress) => {
    logImageWorker("job.progress", {
      jobId: job.id,
      itemId: job.data.itemId,
      progress,
    });
  });

  activeWorker.on("completed", async (job, result) => {
    logImageWorker("job.listener.completed", {
      jobId: job.id,
      itemId: job.data.itemId,
      processedImageCount: result.processedImageUrls.length,
      skipped: result.skipped ?? false,
    });

    // No temp-file cleanup is required because job payload stores in-memory image buffers.
  });

  activeWorker.on("failed", async (job, error) => {
    if (!job) {
      return;
    }

    const attemptsLimit = Number(job.opts.attempts ?? 1);
    const isFinalAttempt = job.attemptsMade >= attemptsLimit;

    logImageWorker("job.failed", {
      level: "error",
      jobId: job.id,
      itemId: job.data.itemId,
      attemptsMade: job.attemptsMade,
      attemptsLimit,
      isFinalAttempt,
      message: error.message,
    });

    if (!isFinalAttempt) {
      return;
    }

    await ItemModel.findByIdAndUpdate(job.data.itemId, {
      imageProcessingStatus: "failed",
      imageProcessingJobId: String(job.id ?? job.data.itemId),
      imageProcessingError: error.message,
      imageProcessingUpdatedAt: new Date(),
      updatedAt: new Date(),
    });

    await imageProcessingDeadLetterQueue.add(
      "image-processing-dead-letter",
      {
        ...job.data,
        failedReason: error.message,
        failedAt: new Date().toISOString(),
        jobId: String(job.id ?? job.data.itemId),
        attemptsMade: job.attemptsMade,
      },
      {
        jobId: `dlq-${job.id ?? job.data.itemId}`,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );
  });

  activeWorker.on("error", (error) => {
    logImageWorker("worker.error", {
      level: "error",
      message: error.message,
    });
  });

  activeWorker.on("stalled", (jobId) => {
    logImageWorker("job.stalled", {
      level: "warn",
      jobId,
    });
  });

  await activeWorker.waitUntilReady();

  logImageWorker("worker.started", {
    concurrency,
    queue: IMAGE_PROCESSING_QUEUE_NAME,
  });
}

export async function stopImageWorker(): Promise<void> {
  if (activeWorker) {
    await activeWorker.close();
    activeWorker = null;
  }

  await closeBullRedis();
}
