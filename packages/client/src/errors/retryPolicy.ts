import { ApiClientError } from "./apiClientError";

export const MAX_QUERY_RETRIES = 3;

const FIRST_CLIENT_ERROR_STATUS = 400;
const FIRST_SERVER_ERROR_STATUS = 500;
const REQUEST_TIMEOUT_STATUS = 408;
const TOO_MANY_REQUESTS_STATUS = 429;
const CLIENT_ERRORS_WORTH_RETRYING = new Set([REQUEST_TIMEOUT_STATUS, TOO_MANY_REQUESTS_STATUS]);

const isFinalClientError = (error: unknown): boolean => {
  if (!(error instanceof ApiClientError) || error.status === undefined) return false;
  const isClientError =
    error.status >= FIRST_CLIENT_ERROR_STATUS && error.status < FIRST_SERVER_ERROR_STATUS;
  return isClientError && !CLIENT_ERRORS_WORTH_RETRYING.has(error.status);
};

export const shouldRetryRequest = (failureCount: number, error: unknown): boolean =>
  failureCount < MAX_QUERY_RETRIES && !isFinalClientError(error);
