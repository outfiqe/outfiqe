import { NEPAL_PHONE_REGEX, stripPhoneSeparators } from "@outfiqe/utils";
import { z } from "zod";

export const MOBILE_NUMBER_ERROR_MESSAGE = "Enter a valid mobile number";

export const nepalPhoneField = (errorMessage: string = MOBILE_NUMBER_ERROR_MESSAGE) =>
  z
    .string()
    .transform(stripPhoneSeparators)
    .pipe(z.string().regex(NEPAL_PHONE_REGEX, errorMessage));
