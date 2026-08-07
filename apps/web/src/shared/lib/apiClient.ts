// One shared fetch wrapper. Every feature's api/ file calls through this
// instead of calling fetch() directly, so pointing a feature at a different
// origin (or a different microservice) later is a one-line change.
//
// Empty VITE_API_URL means "use the Vite dev proxy" (/api -> localhost:4000).
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ""}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
