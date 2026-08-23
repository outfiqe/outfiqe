export enum OAuthProviderParam {
  GOOGLE = "google",
  FACEBOOK = "facebook",
}

export enum OAuthCallbackStatus {
  SIGNED_IN = "signed_in",
  LINK_REQUIRED = "link_required",
}

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const OAUTH_START_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS = 20;
