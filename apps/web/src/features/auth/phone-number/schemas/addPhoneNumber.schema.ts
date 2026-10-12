import { z } from "zod";

import { phoneField } from "../../schemas/shared.schema";

export const addPhoneNumberSchema = z.object({
  phone: phoneField,
});

export type AddPhoneNumberInput = z.infer<typeof addPhoneNumberSchema>;
