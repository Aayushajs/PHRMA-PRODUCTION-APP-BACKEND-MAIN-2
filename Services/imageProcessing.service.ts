import fs from "node:fs/promises";
import path from "node:path";
import ItemModel from "../Databases/Models/item.Model.js";
import { uploadBufferToCloudinary } from "../Utils/cloudinaryImageUpload.js";
import { cleanupTempFiles, type StoredTempImage } from "../Utils/imageProcessingFiles.js";

function getFastApiEndpoint(): string {
  const rawEndpoint =
    process.env.FASTAPI_BACKGROUND_REMOVAL_URL?.trim() ||
    process.env.BACKGROUND_REMOVAL_API_URL?.trim() ||
    process.env.FASTAPI_BG_REMOVE_URL?.trim() ||
    "http://127.0.0.1:7860/remove-bg";

  if (rawEndpoint.endsWith("/remove-bg")) {
    return rawEndpoint;
  }

  return `${rawEndpoint.replace(/\/$/, "")}/remove-bg`;
}

export class ImageProcessingService {
  static async hasCompletedProcessing(itemId: string): Promise<boolean> {
    const item = await ItemModel.findById(itemId).select("itemImages imageProcessingStatus").lean();

    if (!item) {
      return false;
    }

    return item.imageProcessingStatus === "completed" && Array.isArray(item.itemImages) && item.itemImages.length > 0;
  }

  static async markProcessingStarted(itemId: string, jobId: string, imageCount: number): Promise<void> {
    await ItemModel.findByIdAndUpdate(itemId, {
      imageProcessingStatus: "processing",
      imageProcessingJobId: jobId,
      imageProcessingError: null,
      imageProcessingImageCount: imageCount,
      imageProcessingUpdatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async markProcessingCompleted(itemId: string, jobId: string, imageUrls: string[]): Promise<void> {
    await ItemModel.findByIdAndUpdate(itemId, {
      itemImages: imageUrls,
      imageProcessingStatus: "completed",
      imageProcessingJobId: jobId,
      imageProcessingError: null,
      imageProcessingImageCount: imageUrls.length,
      imageProcessingUpdatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async markProcessingFailed(itemId: string, jobId: string, reason: string): Promise<void> {
    await ItemModel.findByIdAndUpdate(itemId, {
      imageProcessingStatus: "failed",
      imageProcessingJobId: jobId,
      imageProcessingError: reason,
      imageProcessingUpdatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async removeBackground(image: StoredTempImage): Promise<Buffer> {
    const timeoutMs = Number(process.env.FASTAPI_REQUEST_TIMEOUT_MS ?? 30000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fileBuffer = await fs.readFile(image.tempPath);
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([fileBuffer], { type: image.mimeType || "application/octet-stream" }),
        path.basename(image.tempPath)
      );

      const response = await fetch(getFastApiEndpoint(), {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`FastAPI background removal failed with ${response.status}: ${errorBody || response.statusText}`);
      }

      const processedArrayBuffer = await response.arrayBuffer();

      if (!processedArrayBuffer.byteLength) {
        throw new Error("FastAPI returned an empty processed image");
      }

      return Buffer.from(processedArrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  static async uploadProcessedImageToCloudinary(fileBuffer: Buffer, itemId: string, imageIndex: number): Promise<string> {
    const folder = process.env.CLOUDINARY_ITEM_FOLDER?.trim() || "Epharma/items";
    const timeoutMs = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS ?? 60000);

    const uploadResult = await uploadBufferToCloudinary(fileBuffer, {
      folder,
      publicId: `items/${itemId}-${imageIndex}`,
      overwrite: true,
      timeoutMs,
    });

    return uploadResult.secure_url;
  }

  static async cleanupTemporaryImages(images: StoredTempImage[]): Promise<void> {
    await cleanupTempFiles(images.map((image) => image.tempPath));
  }
}
