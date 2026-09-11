import { z } from "zod";

import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  RESERVED_HANDLES,
} from "./handle.utils.js";

export const handleField = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH, `Username must be at least ${HANDLE_MIN_LENGTH} characters.`)
  .max(HANDLE_MAX_LENGTH, `Username can be at most ${HANDLE_MAX_LENGTH} characters.`)
  .regex(
    HANDLE_PATTERN,
    "Username must start with a letter and can only contain lowercase letters, numbers, and underscores.",
  )
  .refine((handle) => !RESERVED_HANDLES.has(handle), "That username is reserved.");
