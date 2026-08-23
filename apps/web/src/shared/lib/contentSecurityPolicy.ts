export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export const getSentryConnectSrc = (): string => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return ` ${new URL(dsn).origin}`;
  } catch {
    return "";
  }
};

export const toWebSocketOrigin = (origin: string): string => origin.replace(/^http/, "ws");

type BuildContentSecurityPolicyOptions = {
  nonce: string;
  isDev: boolean;
  isProduction: boolean;
  apiOrigin: string;
};

export const buildContentSecurityPolicy = ({
  nonce,
  isDev,
  isProduction,
  apiOrigin,
}: BuildContentSecurityPolicyOptions): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_ORIGIN}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ${toWebSocketOrigin(apiOrigin)} ${TURNSTILE_ORIGIN}${getSentryConnectSrc()}`,
    `frame-src 'self' ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
