/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Type declarations for Express with Multer support
 * ═══════════════════════════════════════════════════════════════════════════
 */

/// <reference types="multer" />

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer: Buffer;
      }
    }
  }
}

export {};
