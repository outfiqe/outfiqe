export enum OAuthProviderParam {
  GOOGLE = "google",
  FACEBOOK = "facebook",
}

export enum OAuthFlowIntent {
  SIGN_IN = "sign_in",
  LINK = "link",
}

export enum OAuthCallbackStatus {
  SIGNED_IN = "signed_in",
  LINK_REQUIRED = "link_required",
  LINK_COMPLETED = "link_completed",
}

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const OAUTH_START_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS = 20;

export const OAUTH_LINK_START_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const OAUTH_LINK_START_IP_RATE_LIMIT_MAX_REQUESTS = 20;

export const OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_MAX_REQUESTS = 10;
