export interface PipelineLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export const noopPipelineLogger: PipelineLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
