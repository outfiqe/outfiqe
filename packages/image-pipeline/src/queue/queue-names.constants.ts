export const IMAGE_QUEUE_NAMES = {
  ingest: "image-ingest",
  resize: "image-resize",
  optimize: "image-optimize",
  thumbnail: "image-thumbnail",
  cleanup: "image-cleanup",
  deadLetter: "image-dead-letter",
} as const;

export type ImageQueueName = (typeof IMAGE_QUEUE_NAMES)[keyof typeof IMAGE_QUEUE_NAMES];
