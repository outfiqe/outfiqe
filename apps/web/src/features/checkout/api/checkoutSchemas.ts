import { z } from "zod";

export const paymentMethodSchema = z.enum(["COD", "ESEWA", "KHALTI"]);
export type PaymentMethodValue = z.infer<typeof paymentMethodSchema>;

export const checkoutInputSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  address: z.string().trim().min(1, "Enter your delivery address").max(300),
  city: z.string().trim().min(1, "Enter your city").max(120),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema,
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  brandName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  attributedCreatorName: z.string().nullable(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  landmark: z.string().nullable(),
  paymentMethod: paymentMethodSchema,
  paymentStatus: z.enum(["INITIATED", "PAID", "DUE", "FAILED", "REFUNDED"]),
  fulfilmentStatus: z.enum(["PLACED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  subtotal: z.number(),
  deliveryFee: z.number(),
  codFee: z.number(),
  total: z.number(),
  items: z.array(orderItemSchema),
});
export type Order = z.infer<typeof orderSchema>;
