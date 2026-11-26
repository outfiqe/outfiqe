import { z } from "zod";

import { paymentMethodSchema } from "@/features/orders";
import { nepalPhoneField } from "@/shared/lib/nepalPhoneField";

export { PaymentMethod, type PaymentMethodValue } from "@/features/orders";

export const checkoutInputSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(120),
  phone: nepalPhoneField(),
  address: z.string().trim().min(1, "Enter your delivery address").max(300),
  city: z.string().trim().min(1, "Select your city").max(120),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema,
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export type BuyNowLine = {
  productId: string;
  sizeId: string;
  qty: number;
};
