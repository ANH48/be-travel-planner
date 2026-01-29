import { Injectable } from '@nestjs/common';
import ImageKit from '@imagekit/nodejs';

export interface ImageKitAuthParams {
  token: string;
  signature: string;
  expire: number;
  publicKey: string;
  urlEndpoint: string;
}

@Injectable()
export class ImageKitService {
  private imagekit: ImageKit;
  private publicKey: string;
  private urlEndpoint: string;

  constructor() {
    this.publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
    this.urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';

    this.imagekit = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    });
  }

  /**
   * Generate authentication parameters for client-side upload
   * Token expires in 50 minutes (ImageKit requires < 1 hour)
   */
  getAuthenticationParameters(): ImageKitAuthParams {
    // SDK v7: expire parameter is seconds from now, not Unix timestamp
    // ImageKit API requires expire to be LESS than 1 hour (strict check)
    const fiftyMinutes = 50 * 60; // 3000 seconds
    const expireInSeconds = Math.floor(Date.now() / 1000) + fiftyMinutes
    const authParams = this.imagekit.helper.getAuthenticationParameters(
      undefined,
      expireInSeconds,
    );

    return {
      token: authParams.token,
      signature: authParams.signature,
      expire: authParams.expire,
      publicKey: this.publicKey,
      urlEndpoint: this.urlEndpoint,
    };
  }

  /**
   * Delete file from ImageKit by fileId
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.imagekit.files.delete(fileId);
    } catch (error) {
      // Log but don't throw - image may already be deleted
      console.error(`Failed to delete ImageKit file ${fileId}:`, error.message);
    }
  }

  /**
   * Build optimized URL with transformations
   */
  buildUrl(
    path: string,
    options?: { width?: number; height?: number; quality?: number },
  ): string {
    const transformation: Array<Record<string, unknown>> = [];

    if (options?.width) transformation.push({ width: options.width });
    if (options?.height) transformation.push({ height: options.height });
    if (options?.quality) transformation.push({ quality: options.quality });

    if (transformation.length === 0) {
      return `${this.urlEndpoint}${path}`;
    }

    return this.imagekit.helper.buildSrc({
      src: path,
      urlEndpoint: this.urlEndpoint,
      transformation,
    });
  }
}
