import { NEPAL_PHONE_REGEX } from "@outfiqe/utils";
import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(NEPAL_PHONE_REGEX, "Phone must be 10 digits starting with 98");
