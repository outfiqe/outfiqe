import type { Response } from "express";

const DEFAULT_SUCCESS_STATUS = 200;
const DEFAULT_SUCCESS_MESSAGE = "Request successful";

type SuccessResponseBody<T> = {
  success: true;
  message: string;
  data: T;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = DEFAULT_SUCCESS_MESSAGE,
  status: number = DEFAULT_SUCCESS_STATUS,
): Response<SuccessResponseBody<T>> => {
  return res.status(status).json({ success: true, message, data });
};
