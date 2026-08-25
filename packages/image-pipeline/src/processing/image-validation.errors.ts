export class ImageTooLargeError extends Error {
  constructor(
    public readonly bytes: number,
    public readonly maxBytes: number,
  ) {
    super(`Image is ${bytes} bytes, exceeding the ${maxBytes} byte limit.`);
    this.name = "ImageTooLargeError";
  }
}

export class ImageDimensionsExceededError extends Error {
  constructor(
    public readonly pixels: number,
    public readonly maxPixels: number,
  ) {
    super(`Image has ${pixels} pixels, exceeding the ${maxPixels} pixel cap.`);
    this.name = "ImageDimensionsExceededError";
  }
}

export class UnsupportedImageFormatError extends Error {
  constructor(public readonly format: string) {
    super(`Unsupported image format: ${format}`);
    this.name = "UnsupportedImageFormatError";
  }
}

export class CorruptImageError extends Error {
  constructor(cause: unknown) {
    super("Image could not be decoded — it is corrupt or not a valid image.");
    this.name = "CorruptImageError";
    this.cause = cause;
  }
}
