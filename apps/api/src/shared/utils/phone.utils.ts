import { z } from "zod";

export const PHONE_REGEX = /^98\d{8}$/;

export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, "Phone must be 10 digits starting with 98");
