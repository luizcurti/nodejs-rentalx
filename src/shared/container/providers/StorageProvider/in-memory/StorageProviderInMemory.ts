import { IStorageProvider } from "../IStorageProvider";

class StorageProviderInMemory implements IStorageProvider {
  private files: Record<string, string[]> = {};

  async save(file: string, folder: string): Promise<string> {
    if (!this.files[folder]) {
      this.files[folder] = [];
    }
    this.files[folder].push(file);
    return file;
  }

  async delete(file: string, folder: string): Promise<void> {
    if (!this.files[folder]) return;
    this.files[folder] = this.files[folder].filter(f => f !== file);
  }

  getFiles(folder: string): string[] {
    return this.files[folder] || [];
  }

  clear(): void {
    this.files = {};
  }
}

export { StorageProviderInMemory };