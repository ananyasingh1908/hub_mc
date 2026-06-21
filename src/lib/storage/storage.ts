export interface StorageProvider {
  save(filename: string, data: ArrayBuffer, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}

interface R2LikeBucket {
  put(key: string, data: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
}

class R2StorageProvider implements StorageProvider {
  constructor(private bucket: R2LikeBucket) {}

  private assertSafeBasename(filename: string): string {
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new Error("Unsafe filename rejected");
    }
    return filename;
  }

  async save(filename: string, data: ArrayBuffer, contentType: string): Promise<string> {
    const safeName = this.assertSafeBasename(filename);
    await this.bucket.put(safeName, data, { httpMetadata: { contentType } });
    return `/uploads/${safeName}`;
  }

  async delete(url: string): Promise<void> {
    const filename = url.replace("/uploads/", "");
    const safeName = this.assertSafeBasename(filename);
    await this.bucket.delete(safeName);
  }
}

let provider: StorageProvider | null = null;
let globalR2Bucket: R2LikeBucket | undefined;

export function setR2Bucket(bucket: R2LikeBucket): void {
  globalR2Bucket = bucket;
}

export function getStorage(): StorageProvider {
  if (!provider) {
    const bucket = globalR2Bucket;
    if (bucket) {
      provider = new R2StorageProvider(bucket);
    } else {
      throw new Error(
        "No storage provider available. On Cloudflare, bind an R2 bucket as UPLOADS_BUCKET.",
      );
    }
  }
  return provider;
}
