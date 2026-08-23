export const DEFAULT_LOCAL_API_ORIGIN = "http://localhost:4000";

export const getPublicApiOrigin = (): string =>
  process.env.NEXT_PUBLIC_SOCKET_URL ?? DEFAULT_LOCAL_API_ORIGIN;
