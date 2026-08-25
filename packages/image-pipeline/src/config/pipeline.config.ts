import { z } from "zod";

const pipelineEnvSchema = z.object({
  IMAGE_QUEUE_REDIS_HOST: z.string().min(1).default("localhost"),
  IMAGE_QUEUE_REDIS_PORT: z.coerce.number().int().positive().default(6379),
  IMAGE_QUEUE_REDIS_PASSWORD: z.string().optional(),
  IMAGE_QUEUE_REDIS_TLS: z.stringbool().default(false),
  IMAGE_QUEUE_REDIS_DB: z.coerce.number().int().min(0).default(0),

  IMAGE_STORAGE_ROOT_DIR: z.string().default("uploads/image-pipeline"),
  IMAGE_TEMP_UPLOAD_DIR: z.string().default("uploads/image-pipeline-temp"),

  IMAGE_INGEST_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  IMAGE_RESIZE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  IMAGE_OPTIMIZE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  IMAGE_THUMBNAIL_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(6),
  IMAGE_CLEANUP_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),

  IMAGE_QUEUE_RATE_LIMIT_MAX_JOBS: z.coerce.number().int().positive().default(20),
  IMAGE_QUEUE_RATE_LIMIT_DURATION_MS: z.coerce.number().int().positive().default(1000),

  IMAGE_QUEUE_BACKPRESSURE_MAX_DEPTH: z.coerce.number().int().positive().default(500),
  IMAGE_QUEUE_BACKPRESSURE_RETRY_AFTER_SECONDS: z.coerce.number().int().positive().default(30),

  IMAGE_QUEUE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  IMAGE_QUEUE_BACKOFF_BASE_DELAY_MS: z.coerce.number().int().positive().default(2000),
  IMAGE_QUEUE_BACKOFF_JITTER: z.coerce.number().min(0).max(1).default(0.5),

  IMAGE_QUEUE_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  IMAGE_QUEUE_STALLED_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),

  IMAGE_TEMP_FILE_MAX_AGE_HOURS: z.coerce.number().int().positive().default(24),
  IMAGE_CLEANUP_SWEEP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
});

const parsedPipelineEnv = pipelineEnvSchema.parse(process.env);

export const pipelineConfig = {
  redis: {
    host: parsedPipelineEnv.IMAGE_QUEUE_REDIS_HOST,
    port: parsedPipelineEnv.IMAGE_QUEUE_REDIS_PORT,
    password: parsedPipelineEnv.IMAGE_QUEUE_REDIS_PASSWORD,
    tls: parsedPipelineEnv.IMAGE_QUEUE_REDIS_TLS,
    db: parsedPipelineEnv.IMAGE_QUEUE_REDIS_DB,
  },
  storage: {
    rootDir: parsedPipelineEnv.IMAGE_STORAGE_ROOT_DIR,
    tempUploadDir: parsedPipelineEnv.IMAGE_TEMP_UPLOAD_DIR,
  },
  workerConcurrency: {
    ingest: parsedPipelineEnv.IMAGE_INGEST_WORKER_CONCURRENCY,
    resize: parsedPipelineEnv.IMAGE_RESIZE_WORKER_CONCURRENCY,
    optimize: parsedPipelineEnv.IMAGE_OPTIMIZE_WORKER_CONCURRENCY,
    thumbnail: parsedPipelineEnv.IMAGE_THUMBNAIL_WORKER_CONCURRENCY,
    cleanup: parsedPipelineEnv.IMAGE_CLEANUP_WORKER_CONCURRENCY,
  },
  rateLimit: {
    max: parsedPipelineEnv.IMAGE_QUEUE_RATE_LIMIT_MAX_JOBS,
    durationMs: parsedPipelineEnv.IMAGE_QUEUE_RATE_LIMIT_DURATION_MS,
  },
  backPressure: {
    maxQueueDepth: parsedPipelineEnv.IMAGE_QUEUE_BACKPRESSURE_MAX_DEPTH,
    retryAfterSeconds: parsedPipelineEnv.IMAGE_QUEUE_BACKPRESSURE_RETRY_AFTER_SECONDS,
  },
  retry: {
    maxAttempts: parsedPipelineEnv.IMAGE_QUEUE_MAX_ATTEMPTS,
    backoffBaseDelayMs: parsedPipelineEnv.IMAGE_QUEUE_BACKOFF_BASE_DELAY_MS,
    backoffJitter: parsedPipelineEnv.IMAGE_QUEUE_BACKOFF_JITTER,
  },
  jobLifecycle: {
    lockDurationMs: parsedPipelineEnv.IMAGE_QUEUE_LOCK_DURATION_MS,
    stalledIntervalMs: parsedPipelineEnv.IMAGE_QUEUE_STALLED_INTERVAL_MS,
  },
  cleanup: {
    tempFileMaxAgeHours: parsedPipelineEnv.IMAGE_TEMP_FILE_MAX_AGE_HOURS,
    sweepIntervalMs: parsedPipelineEnv.IMAGE_CLEANUP_SWEEP_INTERVAL_MS,
  },
} as const;

export type PipelineConfig = typeof pipelineConfig;
