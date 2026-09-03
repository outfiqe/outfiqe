import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

type CapturedProviderProps = {
  swUrl: string;
  disable?: boolean;
  reloadOnOnline?: boolean;
  options?: RegistrationOptions;
};

const capturedProviderProps: CapturedProviderProps[] = [];

vi.mock("@serwist/turbopack/react", () => ({
  SerwistProvider: ({ children, ...props }: CapturedProviderProps & { children: ReactNode }) => {
    capturedProviderProps.push(props);
    return <>{children}</>;
  },
}));

const renderWithPwaEnabled = async (isPwaEnabled: boolean) => {
  vi.resetModules();
  capturedProviderProps.length = 0;
  vi.doMock("../constants/pwaFeatureFlag", () => ({ isPwaEnabled }));

  const { ServiceWorkerProvider } = await import("./ServiceWorkerProvider");
  render(<ServiceWorkerProvider>the app</ServiceWorkerProvider>);

  const [registrationProps] = capturedProviderProps;
  if (!registrationProps) throw new Error("SerwistProvider was never rendered");

  return registrationProps;
};

afterEach(() => {
  vi.doUnmock("../constants/pwaFeatureFlag");
});

describe("ServiceWorkerProvider", () => {
  it("registers the worker at the root scope so it can control every page", async () => {
    const { swUrl, options } = await renderWithPwaEnabled(true);

    expect(swUrl).toBe("/serwist/sw.js");
    expect(options?.scope).toBe("/");
  });

  it("registers a classic worker so older Safari and Firefox are still covered", async () => {
    const { options } = await renderWithPwaEnabled(true);

    expect(options?.type).toBe("classic");
  });

  it("never reloads the page on reconnect, which would interrupt an upload", async () => {
    const { reloadOnOnline } = await renderWithPwaEnabled(true);

    expect(reloadOnOnline).toBe(false);
  });

  it("stays switched off while the feature flag is off", async () => {
    const { disable } = await renderWithPwaEnabled(false);

    expect(disable).toBe(true);
  });

  it("renders the app whether or not the worker is enabled", async () => {
    await renderWithPwaEnabled(false);

    expect(screen.getByText("the app")).toBeInTheDocument();
  });
});
