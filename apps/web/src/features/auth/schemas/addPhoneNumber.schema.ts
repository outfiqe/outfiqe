import { z } from "zod";

import { phoneField } from "./shared.schema";

export const addPhoneNumberSchema = z.object({
  phone: phoneField,
});

export type AddPhoneNumberInput = z.infer<typeof addPhoneNumberSchema>;
