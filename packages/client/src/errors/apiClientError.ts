export class ApiClientError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(message: string, code: string, details?: unknown, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}
