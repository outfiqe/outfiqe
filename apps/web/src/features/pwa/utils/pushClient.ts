import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

import { isIosBrowser } from "./standalone";

const publicKeyResponseSchema = z.object({ publicKey: z.string().nullable() });

const BASE64_GROUP_SIZE = 4;

const urlBase64ToApplicationServerKey = (base64: string): ArrayBuffer => {
  const padding = "=".repeat(
    (BASE64_GROUP_SIZE - (base64.length % BASE64_GROUP_SIZE)) % BASE64_GROUP_SIZE,
  );
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
};

const detectPlatform = (): "ANDROID" | "IOS" | "DESKTOP" => {
  if (isIosBrowser()) return "IOS";
  if (/Android/i.test(navigator.userAgent)) return "ANDROID";
  return "DESKTOP";
};

const fetchVapidPublicKey = async (): Promise<string | null> => {
  const { data } = await apiClient.get<z.infer<typeof publicKeyResponseSchema>>("/push/public-key");
  return publicKeyResponseSchema.parse(data).publicKey;
};

const toRegisterableSubscription = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    platform: detectPlatform(),
    userAgent: navigator.userAgent,
  };
};

export const subscribeToPush = async (): Promise<boolean> => {
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToApplicationServerKey(publicKey),
    }));

  await apiClient.post("/push/subscriptions", toRegisterableSubscription(subscription));
  return true;
};

export const unsubscribeFromPush = async (): Promise<void> => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await apiClient
    .del("/push/subscriptions", { data: { endpoint: subscription.endpoint } })
    .catch(() => undefined);
  await subscription.unsubscribe();
};
