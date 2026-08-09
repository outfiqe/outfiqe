import type { Response } from "express";
import type { ApiSuccessEnvelope } from "@outfiqe/shared-types";

const DEFAULT_SUCCESS_STATUS = 200;
const DEFAULT_SUCCESS_MESSAGE = "Request successful";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = DEFAULT_SUCCESS_MESSAGE,
  status: number = DEFAULT_SUCCESS_STATUS,
): Response<ApiSuccessEnvelope<T>> => {
  return res.status(status).json({ success: true, message, data });
};
