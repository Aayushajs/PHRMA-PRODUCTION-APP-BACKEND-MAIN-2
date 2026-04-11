import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TEMP_DIR = path.join(process.cwd(), "temp_uploads", "image-processing");

export interface StoredTempImage {
  tempPath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "image";
}

function getImageExtension(mimeType: string, originalName: string): string {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType === "image/png") return ".png";
  if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") return ".jpg";
  if (normalizedMimeType === "image/webp") return ".webp";
  if (normalizedMimeType === "image/gif") return ".gif";

  const existingExtension = path.extname(originalName).toLowerCase();
  return existingExtension || ".png";
}

async function ensureTempDirectory(): Promise<string> {
  const tempDirectory = process.env.IMAGE_PROCESSING_TEMP_DIR?.trim() || DEFAULT_TEMP_DIR;
  await mkdir(tempDirectory, { recursive: true });
  return tempDirectory;
}

export async function persistUploadedImageFiles(files: Express.Multer.File[], itemId: string): Promise<StoredTempImage[]> {
  const tempDirectory = await ensureTempDirectory();
  const timestamp = Date.now();

  return Promise.all(
    files.map(async (file, index) => {
      const safeName = sanitizeFileName(path.basename(file.originalname, path.extname(file.originalname)));
      const extension = getImageExtension(file.mimetype, file.originalname);
      const tempFileName = `${itemId}-${timestamp}-${index}-${safeName}${extension}`;
      const tempPath = path.join(tempDirectory, tempFileName);

      await writeFile(tempPath, file.buffer);

      return {
        tempPath,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      } satisfies StoredTempImage;
    })
  );
}

export async function cleanupTempFiles(pathsToRemove: string[]): Promise<void> {
  await Promise.allSettled(
    pathsToRemove.map(async (filePath) => {
      if (!filePath) return;

      try {
        await unlink(filePath);
      } catch {
        // Best effort cleanup only.
      }
    })
  );
}
