import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

import { parseRoundTimes, TIME_OF_DAY_PATTERN } from "../utils/hubForm.utils";

const MAX_READY_CUTOFF_MINUTES = 240;
const TIME_MESSAGE = "Use the 24-hour HH:mm format, for example 09:30.";

const timeOfDayText = z.string().trim().regex(TIME_OF_DAY_PATTERN, TIME_MESSAGE);

export const hubFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name for the hub.").max(80),
    address: z.string().trim().min(1, "Enter the hub's address.").max(200),
    city: z.string().trim().min(1, "Enter the hub's city.").max(120),
    phone: z.string().trim().min(6, "Enter the hub's phone number.").max(20),
    timeZone: z.string().trim().min(1, "Enter the hub's time zone."),
    workingDays: z.array(z.number()).min(1, "Pick at least one working day."),
    openTime: timeOfDayText,
    closeTime: timeOfDayText,
    pickupRoundTimes: z
      .string()
      .trim()
      .refine((raw) => parseRoundTimes(raw) !== null, {
        message: "List the round times as HH:mm, separated by commas — for example 11:00, 15:00.",
      }),
    readyCutoffMinutes: wholeNumberText("the ready-by cutoff", { max: MAX_READY_CUTOFF_MINUTES }),
    partnerCollectionTime: timeOfDayText,
    isActive: z.boolean(),
  })
  .refine(({ openTime, closeTime }) => openTime < closeTime, {
    message: "The hub must close after it opens.",
    path: ["closeTime"],
  });
export type HubFormValues = z.infer<typeof hubFormSchema>;
