export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export type ApiSuccessEnvelope<T> = { success: true; message: string; data: T };
export type ApiErrorEnvelope = { success: false } & ApiError;
