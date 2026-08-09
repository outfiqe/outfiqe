import { z } from "zod";

import { NEPAL_PHONE_REGEX } from "@outfiqe/shared-utils";

export const phoneSchema = z
  .string()
  .regex(NEPAL_PHONE_REGEX, "Phone must be 10 digits starting with 98");
