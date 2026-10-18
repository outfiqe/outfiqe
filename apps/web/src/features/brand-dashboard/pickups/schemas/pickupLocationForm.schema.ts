import { z } from "zod";

import { parseMapPin } from "../utils/pickupLocationForm.utils";

export const pickupLocationFormSchema = z.object({
  label: z.string().trim().min(1, "Give this location a name, like Studio").max(60),
  contactName: z.string().trim().min(1, "Enter who hands over parcels here").max(80),
  contactPhone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  address: z.string().trim().min(1, "Enter the street address").max(200),
  city: z.string().trim().min(1, "Select a city").max(120),
  landmark: z.string().trim().max(120),
  mapPin: z
    .string()
    .trim()
    .refine((mapPin) => mapPin === "" || parseMapPin(mapPin) !== null, {
      message: "Paste the pin as latitude, longitude — for example 27.6766, 85.3132",
    }),
  openingNote: z.string().trim().max(200),
});
export type PickupLocationFormInput = z.infer<typeof pickupLocationFormSchema>;
