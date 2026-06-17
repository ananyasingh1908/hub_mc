export interface StorageProvider {
  save(filename: string, data: ArrayBuffer, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private async getUploadsDir(): Promise<string> {
    const { join } = await import("path");
    return join(process.cwd(), "public", "uploads");
  }

  private assertSafeBasename(filename: string): string {
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new Error("Unsafe filename rejected");
    }
    return filename;
  }

  async save(filename: string, data: ArrayBuffer, _contentType: string): Promise<string> {
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const safeName = this.assertSafeBasename(filename);
    const dir = await this.getUploadsDir();
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, safeName);
    if (!filepath.startsWith(dir)) {
      throw new Error("Path traversal detected");
    }
    await writeFile(filepath, Buffer.from(data));
    return `/uploads/${safeName}`;
  }

  async delete(url: string): Promise<void> {
    const { unlink } = await import("fs/promises");
    const { join } = await import("path");
    const filename = url.replace("/uploads/", "");
    const safeName = this.assertSafeBasename(filename);
    const dir = await this.getUploadsDir();
    const filepath = join(dir, safeName);
    if (!filepath.startsWith(dir)) return;
    try {
      await unlink(filepath);
    } catch {}
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider();
  }
  return provider;
}
