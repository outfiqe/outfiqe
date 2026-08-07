// Types shared between apps/api and apps/web.
// Keep this package free of runtime logic - types only.
// This is what makes it painless to split api into microservices later:
// each service can still import the same contract package.

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}
