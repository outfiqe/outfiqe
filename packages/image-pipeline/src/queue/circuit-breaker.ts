import type { PipelineLogger } from "../workers/pipeline-logger.types.js";
import { noopPipelineLogger } from "../workers/pipeline-logger.types.js";

export type CircuitBreakerOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

export type CircuitBreakerDeps = {
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;
  logger?: PipelineLogger;
  scheduleResume?: (callback: () => void, delayMs: number) => void;
};

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private tripped = false;

  constructor(
    private readonly options: CircuitBreakerOptions,
    private readonly deps: CircuitBreakerDeps,
  ) {}

  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  async recordFailure(): Promise<void> {
    const { failureThreshold, cooldownMs } = this.options;
    const {
      logger: configuredLogger,
      pauseQueue,
      resumeQueue,
      scheduleResume: configuredScheduleResume,
    } = this.deps;

    this.consecutiveFailures += 1;
    if (this.tripped || this.consecutiveFailures < failureThreshold) {
      return;
    }

    this.tripped = true;
    const logger = configuredLogger ?? noopPipelineLogger;
    logger.error("image-pipeline: circuit breaker tripped — pausing queue", {
      consecutiveFailures: this.consecutiveFailures,
      cooldownMs,
    });

    await pauseQueue();

    const scheduleResume =
      configuredScheduleResume ??
      ((callback: () => void, delayMs: number) => {
        setTimeout(callback, delayMs);
      });
    scheduleResume(() => {
      this.consecutiveFailures = 0;
      this.tripped = false;
      void resumeQueue();
    }, cooldownMs);
  }

  isTripped(): boolean {
    return this.tripped;
  }
}
