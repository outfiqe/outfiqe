export type UploadableFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export type UploadedFile = {
  url: string;
  key: string;
};

export interface StorageProvider {
  upload(file: UploadableFile): Promise<UploadedFile>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  keyFromPublicUrl(url: string): string | null;
}
