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

type BuildContentSecurityPolicyOptions = {
  nonce: string;
  isDev: boolean;
  isProduction: boolean;
};

export const buildContentSecurityPolicy = ({
  nonce,
  isDev,
  isProduction,
}: BuildContentSecurityPolicyOptions): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_ORIGIN}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${TURNSTILE_ORIGIN}${getSentryConnectSrc()}`,
    `frame-src 'self' ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
