export const SERVICE_WORKER_ERROR_MESSAGE = "outfiqe-service-worker-error";

export type ServiceWorkerErrorReport = {
  type: typeof SERVICE_WORKER_ERROR_MESSAGE;
  context: string;
  message: string;
  stack?: string;
};

export const isServiceWorkerErrorReport = (data: unknown): data is ServiceWorkerErrorReport =>
  typeof data === "object" &&
  data !== null &&
  (data as { type?: unknown }).type === SERVICE_WORKER_ERROR_MESSAGE;
