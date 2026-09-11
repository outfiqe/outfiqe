import { THEME_INIT_SCRIPT_SHA256 } from "@outfiqe/design-system";

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const ESEWA_FORM_POST_ORIGINS = "https://epay.esewa.com.np https://rc-epay.esewa.com.np";

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

type CspRenderMode = "dynamic" | "static";

type BuildContentSecurityPolicyOptions = {
  nonce: string;
  isDev: boolean;
  isProduction: boolean;
  apiOrigin: string;
  renderMode?: CspRenderMode;
};

const scriptSrc = (nonce: string, isDev: boolean, renderMode: CspRenderMode): string => {
  if (renderMode === "static") {
    const devTrustAnchor = isDev ? " 'unsafe-eval'" : "";
    return `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${devTrustAnchor} ${TURNSTILE_ORIGIN}`;
  }

  const trustAnchor = isDev ? "'unsafe-eval'" : "'strict-dynamic' 'wasm-unsafe-eval'";

  return `script-src 'self' 'nonce-${nonce}' '${THEME_INIT_SCRIPT_SHA256}' ${trustAnchor} ${TURNSTILE_ORIGIN}`;
};

export const buildContentSecurityPolicy = ({
  nonce,
  isDev,
  isProduction,
  apiOrigin,
  renderMode = "dynamic",
}: BuildContentSecurityPolicyOptions): string =>
  [
    "default-src 'self'",
    scriptSrc(nonce, isDev, renderMode),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ${toWebSocketOrigin(apiOrigin)} ${TURNSTILE_ORIGIN}${getSentryConnectSrc()}`,
    "worker-src 'self' blob:",
    `frame-src 'self' ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${ESEWA_FORM_POST_ORIGINS}`,
    "frame-ancestors 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
