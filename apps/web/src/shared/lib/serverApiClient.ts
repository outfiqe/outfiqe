import "server-only";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

type SuccessEnvelope<T> = { success: true; message: string; data: T };
type ErrorEnvelope = { success: false; message: string; code: string; details?: unknown };

export class ServerApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "ServerApiError";
    this.code = code;
    this.details = details;
  }
}

type ServerRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  cookie?: string;
  accessToken?: string;
};

export async function serverApiRequest<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok || !json || (json as { success?: boolean }).success !== true) {
    const err = json as Partial<ErrorEnvelope> | null;
    throw new ServerApiError(
      err?.message ?? `Request failed with ${res.status}`,
      err?.code ?? "UNKNOWN_ERROR",
      err?.details,
    );
  }

  return (json as SuccessEnvelope<T>).data;
}
