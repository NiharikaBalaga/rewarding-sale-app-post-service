import { extname } from 'path';
import type { FileFilterCallback } from 'multer';

export class ImageFileFilter {
  private readonly allowedExtensions = ['.jpg', '.jpeg'];

  fileFilter(req: any, file: any, callback: FileFilterCallback): void {
    const ext = extname(file.originalname);
    if (!this.isValidExtension(ext)) {
      callback(
        // TODO handle error to send it in response
        new Error(`Only ${this.allowedExtensions.join(', ')} files are allowed`)
      );
    } else {
      callback(null, true);
    }
  }

  private isValidExtension(ext: string): boolean {
    return this.allowedExtensions.includes(ext.toLowerCase());
  }
}