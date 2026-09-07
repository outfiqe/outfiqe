"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import { toast } from "@outfiqe/design-system";
import { generateUuid } from "@outfiqe/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  type Address,
  NEW_ADDRESS_OPTION,
  SavedAddressPicker,
  useAddresses,
  useCreateAddress,
} from "@/features/addresses";
import { useAuth } from "@/features/auth/context/AuthContext";
import { type Cart, CART_QUERY_KEY } from "@/features/cart";
import { CityAutocomplete, type DeliveryZone, resolveZonePreview } from "@/features/delivery-zones";
import { redirectToPaymentGateway, useInitiatePayment } from "@/features/payments";
import { useIsOnline } from "@/features/pwa";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BuyNowCouponPreview } from "../api/checkoutApi";
import { type CheckoutInput, checkoutInputSchema, PaymentMethod } from "../api/checkoutSchemas";
import { useCheckout } from "../hooks/useCheckout";
import type { BuyNowPayload } from "../lib/buyNowStorage";
import { clearBuyNowPayload } from "../lib/buyNowStorage";
import { BuyNowCouponForm } from "./BuyNowCouponForm";
import { CheckoutSummary } from "./CheckoutSummary";
import { PaymentMethodField } from "./PaymentMethodField";

type CheckoutFormProps = {
  cart: Cart;
  zones: DeliveryZone[];
  buyNow?: BuyNowPayload;
  buyNowCoupon?: BuyNowCouponPreview | null;
  onBuyNowCouponChange?: (coupon: BuyNowCouponPreview | null) => void;
};

type AddressSelection = string | typeof NEW_ADDRESS_OPTION;

const addressFieldsFrom = (address: Address) => ({
  fullName: address.fullName,
  phone: address.phone,
  address: address.address,
  city: address.city,
  landmark: address.landmark ?? "",
});

export const CheckoutForm = ({
  cart,
  zones,
  buyNow,
  buyNowCoupon = null,
  onBuyNowCouponChange,
}: CheckoutFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const checkout = useCheckout();
  const initiatePayment = useInitiatePayment();
  const createAddress = useCreateAddress();
  const isOnline = useIsOnline();

  const { data: savedAddresses } = useAddresses();
  const addresses = useMemo(() => savedAddresses ?? [], [savedAddresses]);
  const hasSavedAddresses = addresses.length > 0;

  const [selectedAddress, setSelectedAddress] = useState<AddressSelection>(NEW_ADDRESS_OPTION);
  const [isEditingSelectedAddress, setIsEditingSelectedAddress] = useState(false);
  const [shouldSaveNewAddress, setShouldSaveNewAddress] = useState(true);
  const hasInitializedFromSavedAddresses = useRef(false);

  const emptyName = state.user?.name ?? "";

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: {
      fullName: emptyName,
      phone: "",
      address: "",
      city: cart.city ?? "",
      landmark: "",
      paymentMethod: PaymentMethod.COD,
    },
    mode: "onBlur",
  });

  const paymentMethod = form.watch("paymentMethod");
  const city = form.watch("city");
  const codRequiresPrepaid = cart.appliedCoupon?.prepaidOnly ?? false;

  const resolvedZone = useMemo(() => resolveZonePreview(zones, city), [zones, city]);
  const deliveryFee =
    resolvedZone && cart.subtotal < resolvedZone.freeDeliveryThreshold
      ? resolvedZone.standardDeliveryFee
      : 0;
  const codHandlingFee = resolvedZone?.codHandlingFee ?? 0;

  useEffect(() => {
    if (codRequiresPrepaid && paymentMethod === PaymentMethod.COD) {
      form.setValue("paymentMethod", PaymentMethod.ESEWA);
    }
  }, [codRequiresPrepaid, paymentMethod, form]);

  useEffect(() => {
    if (!savedAddresses || hasInitializedFromSavedAddresses.current) return;
    hasInitializedFromSavedAddresses.current = true;

    const preferredAddress =
      savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
    if (!preferredAddress) return;

    setSelectedAddress(preferredAddress.id);
    form.reset({ ...form.getValues(), ...addressFieldsFrom(preferredAddress) });
  }, [savedAddresses, form]);

  const applyAddressSelection = (nextSelection: AddressSelection) => {
    setSelectedAddress(nextSelection);
    setIsEditingSelectedAddress(false);

    if (nextSelection === NEW_ADDRESS_OPTION) {
      form.reset({
        ...form.getValues(),
        fullName: emptyName,
        phone: "",
        address: "",
        city: cart.city ?? "",
        landmark: "",
      });
      return;
    }

    const picked = addresses.find((address) => address.id === nextSelection);
    if (picked) form.reset({ ...form.getValues(), ...addressFieldsFrom(picked) });
  };

  const isNewAddress = selectedAddress === NEW_ADDRESS_OPTION;
  const showAddressFields = isNewAddress || isEditingSelectedAddress;

  const persistNewAddressAfterCheckout = async (values: CheckoutInput) => {
    try {
      await createAddress.mutateAsync({
        label: "",
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        city: values.city,
        landmark: values.landmark ?? "",
        isDefault: !hasSavedAddresses,
      });
    } catch {
      toast.error("Your order is placed, but we couldn't save this address for next time.");
    }
  };

  const revealAddressFieldsOnValidationError = () => {
    if (!isNewAddress) setIsEditingSelectedAddress(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!isOnline) {
      toast.error("Checkout needs a connection. Try again once you're back online.");
      return;
    }

    try {
      const order = await checkout.mutateAsync({
        input: values,
        idempotencyKey: generateUuid(),
        buyNow: buyNow
          ? { productId: buyNow.productId, sizeId: buyNow.sizeId, qty: buyNow.qty }
          : undefined,
        couponCode: buyNow ? (buyNowCoupon?.code ?? undefined) : undefined,
      });

      if (buyNow) clearBuyNowPayload();

      if (isNewAddress && shouldSaveNewAddress) {
        await persistNewAddressAfterCheckout(values);
      }

      if (order.paymentMethod === PaymentMethod.COD) {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        router.push(`/orders/${order.id}`);
        return;
      }

      const result = await initiatePayment.mutateAsync(order.id);
      redirectToPaymentGateway(result);
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(getErrorMessage(error));
    }
  }, revealAddressFieldsOnValidationError);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Delivery address
            </h2>

            {hasSavedAddresses && (
              <div className="mt-3">
                <SavedAddressPicker
                  addresses={addresses}
                  selectedId={selectedAddress}
                  onSelect={applyAddressSelection}
                />
              </div>
            )}

            {hasSavedAddresses && !isNewAddress && !isEditingSelectedAddress && (
              <button
                type="button"
                onClick={() => setIsEditingSelectedAddress(true)}
                className="mt-3 text-sm font-semibold text-primary-strong"
              >
                Edit these details for this order
              </button>
            )}

            {showAddressFields && (
              <>
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field: { ref, name, value, onChange, onBlur } }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <CityAutocomplete
                            ref={ref}
                            name={name}
                            value={value}
                            onChange={onChange}
                            onBlur={onBlur}
                          />
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
              </>
            )}

            {isNewAddress && (
              <label className="mt-4 flex items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={shouldSaveNewAddress}
                  onChange={(event) => setShouldSaveNewAddress(event.target.checked)}
                />
                Save this address for next time
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Payment method
            </h2>
            <PaymentMethodField
              value={paymentMethod}
              onChange={(value) => form.setValue("paymentMethod", value)}
              codRequiresPrepaid={codRequiresPrepaid}
            />
            {paymentMethod === PaymentMethod.COD && (
              <p className="mt-3 text-xs text-muted-foreground">
                A Rs. {codHandlingFee} handling fee applies to cash on delivery.
              </p>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary
            cart={cart}
            deliveryFee={deliveryFee}
            paymentMethod={paymentMethod}
            codHandlingFee={codHandlingFee}
            isSubmitting={checkout.isPending || initiatePayment.isPending}
            isOnline={isOnline}
            couponSlot={
              buyNow && onBuyNowCouponChange ? (
                <BuyNowCouponForm
                  line={{ productId: buyNow.productId, sizeId: buyNow.sizeId, qty: buyNow.qty }}
                  appliedCoupon={buyNowCoupon}
                  onApplied={onBuyNowCouponChange}
                  onRemoved={() => onBuyNowCouponChange(null)}
                />
              ) : undefined
            }
          />
        </div>
      </form>
    </Form>
  );
};
