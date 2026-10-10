import type { ApiSuccessEnvelope } from "@outfiqe/types";
import type { Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";

const DEFAULT_SUCCESS_STATUS = HTTP_STATUS.OK;
const DEFAULT_SUCCESS_MESSAGE = "Request successful";

export const sendSuccess = <T>(
  res: Response,
  responseData: T,
  message: string = DEFAULT_SUCCESS_MESSAGE,
  status: number = DEFAULT_SUCCESS_STATUS,
): Response<ApiSuccessEnvelope<T>> => {
  return res.status(status).json({ success: true, message, data: responseData });
};
