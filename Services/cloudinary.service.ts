import { uploadBufferToCloudinary } from "../Utils/cloudinaryImageUpload.js";

export class CloudinaryService {
  static async uploadProcessedItemImage(imageBuffer: Buffer, itemId: string, imageIndex: number): Promise<string> {
    const folder = process.env.CLOUDINARY_ITEM_FOLDER?.trim() || "Epharma/items";
    const timeoutMs = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS ?? 60000);

    const uploadResult = await uploadBufferToCloudinary(imageBuffer, {
      folder,
      publicId: `items/${itemId}-${imageIndex}`,
      overwrite: true,
      timeoutMs,
    });

    return uploadResult.secure_url;
  }
}
