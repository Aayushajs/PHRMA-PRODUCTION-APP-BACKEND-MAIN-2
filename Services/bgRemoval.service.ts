import { createRequire } from "node:module";

export interface RemoveBackgroundInput {
  imageBuffer: Buffer;
  mimeType: string;
  fileName: string;
}

type BgMiddleware = (req: any, res: any, next: () => void) => void;

const require = createRequire(import.meta.url);
const { removeBgMiddleware } = require("@development-team/bg-remover") as {
  removeBgMiddleware: (options?: {
    timeout?: number;
    retries?: number;
    replaceOriginal?: boolean;
    fieldName?: string;
  }) => BgMiddleware;
};

export class BgRemovalService {
  private static readonly defaultTimeoutMs = 10000;
  private static readonly defaultRetries = 2;
  private static readonly defaultFieldName = "file";

  static async removeBackground(input: RemoveBackgroundInput): Promise<Buffer> {
    const middleware = removeBgMiddleware({
      timeout: this.defaultTimeoutMs,
      retries: this.defaultRetries,
      replaceOriginal: false,
      fieldName: this.defaultFieldName,
    });

    return await new Promise<Buffer>((resolve, reject) => {
      const req: any = {
        file: {
          buffer: input.imageBuffer,
          mimetype: input.mimeType,
          originalname: input.fileName,
          size: input.imageBuffer.length,
        },
      };

      middleware(req, {}, () => {
        if (req.bgError) {
          reject(req.bgError instanceof Error ? req.bgError : new Error(String(req.bgError)));
          return;
        }

        const processedBuffer = req.processedImage?.buffer;

        if (!processedBuffer || !Buffer.isBuffer(processedBuffer) || !processedBuffer.length) {
          reject(new Error("Background removal package did not return a processed image buffer"));
          return;
        }

        resolve(processedBuffer);
      });
    });
  }
}
