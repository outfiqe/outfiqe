import { ApiClientError } from "@/shared/lib/apiClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

const NO_SERVER_ANSWER_CODE = "UNKNOWN_ERROR";

const isAnswerFromServer = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError && error.code !== NO_SERVER_ANSWER_CODE;

export const describeRiderLoadError = (error: unknown, noSignalMessage: string): string =>
  isAnswerFromServer(error) ? getErrorMessage(error) : noSignalMessage;
