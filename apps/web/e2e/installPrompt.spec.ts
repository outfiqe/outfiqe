import { expect, test } from "@playwright/test";

const IOS_SAFARI_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

type WindowWithInstallFlag = Window & { installPromptCalled?: boolean };

type InstallOutcome = "accepted" | "dismissed";

const dispatchFakeBeforeInstallPrompt = (outcome: InstallOutcome): void => {
  window.dispatchEvent(
    Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => {
        (window as WindowWithInstallFlag).installPromptCalled = true;
      },
      userChoice: Promise.resolve({ outcome }),
    }),
  );
};

test.describe("install prompt", () => {
  test("offers a real install once the browser hands over its prompt, and accepting it dismisses the bar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.reload();

    await page.evaluate<void, InstallOutcome>(dispatchFakeBeforeInstallPrompt, "accepted");

    const installButton = page.getByRole("button", { name: "Install" });
    await expect(installButton).toBeVisible();

    await installButton.click();

    await expect(page.getByText("Install Outfiqe for a faster")).toHaveCount(0);
    const wasBrowserPromptCalled = await page.evaluate(
      () => (window as WindowWithInstallFlag).installPromptCalled,
    );
    expect(wasBrowserPromptCalled).toBe(true);
  });

  test("lets someone dismiss it, and stays quiet on the next visit", async ({ page }) => {
    await page.goto("/");
    await page.reload();

    await page.evaluate<void, InstallOutcome>(dispatchFakeBeforeInstallPrompt, "accepted");
    await expect(page.getByRole("button", { name: "Install" })).toBeVisible();

    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByText("Install Outfiqe for a faster")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Install Outfiqe for a faster")).toHaveCount(0);
  });

  test("shows Add to Home Screen steps on an iOS browser tab instead of a native install", async ({
    browser,
  }) => {
    const context = await browser.newContext({ userAgent: IOS_SAFARI_USER_AGENT });
    const page = await context.newPage();

    await page.goto("/");
    await page.reload();

    const installButton = page.getByRole("button", { name: "Install" });
    await expect(installButton).toBeVisible();
    await installButton.click();

    await expect(page.getByText(/tap the share icon/i)).toBeVisible();
    await expect(page.getByText(/add to home screen/i)).toBeVisible();

    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByText(/tap the share icon/i)).toHaveCount(0);

    await context.close();
  });
});
