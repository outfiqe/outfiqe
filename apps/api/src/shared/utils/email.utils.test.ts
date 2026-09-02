import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMock = {
  env: {
    MAIL_FROM: "noreply@outfiqe.com",
    RESEND_API_KEY: "re_test_key" as string | undefined,
    SMTP_HOST: undefined as string | undefined,
    SMTP_PORT: undefined as number | undefined,
    SMTP_SECURE: undefined as boolean | undefined,
    SMTP_USER: undefined as string | undefined,
    SMTP_PASS: undefined as string | undefined,
  },
};

const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

vi.mock("#config/env.config.js", () => envMock);
vi.mock("./winston.utils.js", () => ({ default: loggerMock }));

const { sendEmail } = await import("./email.utils.js");

const message = {
  to: "someone@outfiqe.test",
  subject: "Hello",
  body: "Body text",
  html: "<p>Body</p>",
};

beforeEach(() => {
  envMock.env.RESEND_API_KEY = "re_test_key";
  loggerMock.info.mockClear();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("posts the message to the Resend API when RESEND_API_KEY is set", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      capturedInit = init;
      return Promise.resolve({ ok: true, text: () => Promise.resolve("") } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(message);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      }),
    );
    expect(capturedInit).toBeDefined();
    expect(JSON.parse(String(capturedInit?.body))).toMatchObject({
      from: "noreply@outfiqe.com",
      to: message.to,
      subject: message.subject,
      text: message.body,
      html: message.html,
    });
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("logs the failure instead of throwing when Resend rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 422,
          text: () => Promise.resolve("bad from"),
        } as Response),
      ),
    );

    await expect(sendEmail(message)).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("Email send failed"));
  });

  it("falls back to the console stub when no transport is configured", async () => {
    envMock.env.RESEND_API_KEY = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(message);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledOnce();
    expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(message.subject));
  });
});
