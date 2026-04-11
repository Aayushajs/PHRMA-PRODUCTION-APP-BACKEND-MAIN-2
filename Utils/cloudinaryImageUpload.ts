import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../config/cloudinary.js";

export interface CloudinaryBufferUploadOptions {
  folder: string;
  publicId?: string;
  overwrite?: boolean;
  timeoutMs?: number;
}

export async function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  options: CloudinaryBufferUploadOptions
): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      return reject(new Error("Invalid file buffer"));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        overwrite: options.overwrite ?? true,
        resource_type: "image",
        timeout: options.timeoutMs ?? 60000,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Cloudinary upload completed without a result"));
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}
