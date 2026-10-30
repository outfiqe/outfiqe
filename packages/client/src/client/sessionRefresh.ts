import axios from "axios";

const SESSION_REJECTED_STATUSES = [401, 403];

export const isSessionRejected = (refreshError: unknown): boolean => {
  const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
  return status !== undefined && SESSION_REJECTED_STATUSES.includes(status);
};
