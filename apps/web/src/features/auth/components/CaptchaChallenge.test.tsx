import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaptchaChallenge } from "./CaptchaChallenge";

vi.mock("next/script", () => ({
  default: ({ onReady }: { onReady?: () => void }) => {
    onReady?.();
    return null;
  },
}));

afterEach(() => {
  delete (window as { turnstile?: unknown }).turnstile;
});

describe("CaptchaChallenge", () => {
  it("renders the Turnstile widget once the script is ready", () => {
    const renderWidget = vi.fn().mockReturnValue("widget-id");
    window.turnstile = { render: renderWidget, remove: vi.fn() };

    render(<CaptchaChallenge onVerify={vi.fn()} />);

    expect(renderWidget).toHaveBeenCalledTimes(1);
  });

  it("forwards a solved token to onVerify", () => {
    const renderWidget = vi.fn().mockReturnValue("widget-id");
    window.turnstile = { render: renderWidget, remove: vi.fn() };
    const onVerify = vi.fn();

    render(<CaptchaChallenge onVerify={onVerify} />);
    const [, options] = renderWidget.mock.calls[0] as [
      HTMLElement,
      { callback: (token: string) => void },
    ];
    options.callback("solved-token");

    expect(onVerify).toHaveBeenCalledWith("solved-token");
  });

  it("calls onExpire when the widget's token expires", () => {
    const renderWidget = vi.fn().mockReturnValue("widget-id");
    window.turnstile = { render: renderWidget, remove: vi.fn() };
    const onExpire = vi.fn();

    render(<CaptchaChallenge onVerify={vi.fn()} onExpire={onExpire} />);
    const [, options] = renderWidget.mock.calls[0] as [
      HTMLElement,
      { "expired-callback"?: () => void },
    ];
    options["expired-callback"]?.();

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("removes the widget on unmount", () => {
    const removeWidget = vi.fn();
    window.turnstile = { render: vi.fn().mockReturnValue("widget-id"), remove: removeWidget };

    const { unmount } = render(<CaptchaChallenge onVerify={vi.fn()} />);
    unmount();

    expect(removeWidget).toHaveBeenCalledWith("widget-id");
  });
});
