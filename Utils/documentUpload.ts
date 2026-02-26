/*
┌───────────────────────────────────────────────────────────────────────┐
│  Document Upload Service - Handles file uploads to Cloudinary         │
│  Supports PDF and image formats for licenses and certificates         │
└───────────────────────────────────────────────────────────────────────┘
*/

import { cloudinary } from "../config/cloudinary";
import { ApiError } from "../Middlewares/errorHandler";

interface UploadResult {
    url: string;
    publicId: string;
    format: string;
    size: number;
}

export class DocumentUploadService {
    /**
     * Upload document to Cloudinary
     * @param fileBuffer - File buffer
     * @param fileName - Original file name
     * @param folder - Cloudinary folder path
     * @returns Upload result with URL
     */
    static async uploadDocument(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = "medicine-store/documents"
    ): Promise<UploadResult> {
        try {
            const fileExtension = fileName.split(".").pop()?.toLowerCase();
            const allowedFormats = ["jpg", "jpeg", "png", "pdf", "webp"];

            if (!fileExtension || !allowedFormats.includes(fileExtension)) {
                throw new ApiError(
                    400,
                    `Invalid file format. Allowed: ${allowedFormats.join(", ")}`
                );
            }

            // Convert buffer to base64
            const base64String = fileBuffer.toString("base64");
            const dataURI = `data:${this.getMimeType(fileExtension)};base64,${base64String}`;

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: folder,
                resource_type: fileExtension === "pdf" ? "raw" : "image",
                public_id: `${Date.now()}_${fileName.replace(/\.[^/.]+$/, "")}`,
                allowed_formats: allowedFormats,
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
            };
        } catch (error: any) {
            console.error("Document upload error:", error);
            throw new ApiError(500, `Document upload failed: ${error.message}`);
        }
    }

    /**
     * Upload multiple documents
     * @param files - Array of file buffers with names
     * @param folder - Cloudinary folder path
     * @returns Array of upload results
     */
    static async uploadMultipleDocuments(
        files: Array<{ buffer: Buffer; fileName: string }>,
        folder: string = "medicine-store/documents"
    ): Promise<UploadResult[]> {
        try {
            const uploadPromises = files.map((file) =>
                this.uploadDocument(file.buffer, file.fileName, folder)
            );
            return await Promise.all(uploadPromises);
        } catch (error: any) {
            console.error("Multiple document upload error:", error);
            throw new ApiError(500, `Multiple document upload failed: ${error.message}`);
        }
    }

    /**
     * Delete document from Cloudinary
     * @param publicId - Cloudinary public ID
     */
    static async deleteDocument(publicId: string): Promise<void> {
        try {
            const isPdf = publicId.includes(".pdf");
            await cloudinary.uploader.destroy(publicId, {
                resource_type: isPdf ? "raw" : "image",
            });
        } catch (error: any) {
            console.error("Document deletion error:", error);
            throw new ApiError(500, `Document deletion failed: ${error.message}`);
        }
    }

    /**
     * Get MIME type for file extension
     * @param extension - File extension
     * @returns MIME type string
     */
    private static getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            pdf: "application/pdf",
            webp: "image/webp",
        };
        return mimeTypes[extension] || "application/octet-stream";
    }

    /**
     * Validate file size
     * @param fileSize - File size in bytes
     * @param maxSizeMB - Maximum allowed size in MB
     */
    static validateFileSize(fileSize: number, maxSizeMB: number = 5): void {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (fileSize > maxSizeBytes) {
            throw new ApiError(
                400,
                `File size exceeds ${maxSizeMB}MB limit`
            );
        }
    }
}
