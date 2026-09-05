import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const toastSuccess = vi.fn();

vi.mock("@outfiqe/design-system", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  toast: { success: toastSuccess },
}));

vi.mock("../utils/clearOfflineData", () => ({
  clearAllOfflineData: vi.fn().mockResolvedValue(undefined),
}));

const renderWithPwaEnabled = async (isPwaEnabled: boolean) => {
  vi.resetModules();
  vi.doMock("../constants/pwaFeatureFlag", () => ({ isPwaEnabled }));

  const { ClearOfflineDataCard } = await import("./ClearOfflineDataCard");
  return render(<ClearOfflineDataCard />);
};

afterEach(() => {
  vi.doUnmock("../constants/pwaFeatureFlag");
  vi.clearAllMocks();
});

describe("ClearOfflineDataCard", () => {
  it("clears offline data and confirms with a toast", async () => {
    const { clearAllOfflineData } = await import("../utils/clearOfflineData");
    await renderWithPwaEnabled(true);

    await userEvent.click(screen.getByRole("button", { name: "Clear offline data" }));

    await waitFor(() => expect(clearAllOfflineData).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledWith("Offline data cleared");
  });

  it("renders nothing while the pwa feature is off", async () => {
    const { container } = await renderWithPwaEnabled(false);

    expect(container).toBeEmptyDOMElement();
  });
});
