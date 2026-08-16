"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import { toast } from "@outfiqe/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useAuth } from "@/features/auth/context/AuthContext";
import { type Cart, CART_QUERY_KEY } from "@/features/cart";
import { redirectToPaymentGateway, useInitiatePayment } from "@/features/payments";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { type CheckoutInput, checkoutInputSchema, PaymentMethod } from "../api/checkoutSchemas";
import { COD_HANDLING_FEE } from "../checkout.constants";
import { useCheckout } from "../hooks/useCheckout";
import { CheckoutSummary } from "./CheckoutSummary";
import { PaymentMethodField } from "./PaymentMethodField";

type CheckoutFormProps = {
  cart: Cart;
};

export const CheckoutForm = ({ cart }: CheckoutFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const checkout = useCheckout();
  const initiatePayment = useInitiatePayment();

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: {
      fullName: state.user?.name ?? "",
      phone: "",
      address: "",
      city: "Kathmandu",
      landmark: "",
      paymentMethod: PaymentMethod.COD,
    },
    mode: "onBlur",
  });

  const paymentMethod = form.watch("paymentMethod");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const order = await checkout.mutateAsync({
        input: values,
        idempotencyKey: crypto.randomUUID(),
      });

      if (order.paymentMethod === PaymentMethod.COD) {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        router.push(`/orders/${order.id}`);
        return;
      }

      const result = await initiatePayment.mutateAsync(order.id);
      redirectToPaymentGateway(result);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Delivery address
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="mt-0">
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Tole, ward, landmark" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem className="mt-0">
                    <FormLabel>Landmark (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Near Shankhamul bridge" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              We deliver inside the Kathmandu valley in 2–3 days. Outside it, 4–7 days.
            </p>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Payment method
            </h2>
            <PaymentMethodField
              value={paymentMethod}
              onChange={(value) => form.setValue("paymentMethod", value)}
            />
            {paymentMethod === PaymentMethod.COD && (
              <p className="mt-3 text-xs text-muted-foreground">
                A Rs. {COD_HANDLING_FEE} handling fee applies to cash on delivery.
              </p>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary
            cart={cart}
            paymentMethod={paymentMethod}
            isSubmitting={checkout.isPending || initiatePayment.isPending}
          />
        </div>
      </form>
    </Form>
  );
};
