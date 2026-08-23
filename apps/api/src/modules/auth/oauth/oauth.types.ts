export type OAuthProfile = {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
};

export type OAuthCodeExchangeInput = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};
