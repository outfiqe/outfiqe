import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { SupportRequestForm } from "./SupportRequestForm";

const renderForm = (onSubmitted = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SupportRequestForm onSubmitted={onSubmitted} />
    </QueryClientProvider>,
  );
  return onSubmitted;
};

describe("SupportRequestForm", () => {
  it("submits a request and shows the reference", async () => {
    let sentBody: Record<string, unknown> | undefined;
    mswServer.use(
      http.post("/api/support/tickets", async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { reference: "OFQ-42", id: "t-42" },
        });
      }),
    );

    const onSubmitted = renderForm();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("What's this about?"), "PAYMENT");
    await user.type(screen.getByLabelText("Subject"), "Charged twice");
    await user.type(
      screen.getByLabelText("Message"),
      "My wallet shows two charges for the same order and I only expected one.",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText(/Reference OFQ-42/)).toBeInTheDocument();
    await waitFor(() =>
      expect(onSubmitted).toHaveBeenCalledWith({ reference: "OFQ-42", id: "t-42" }),
    );
    expect(sentBody).toMatchObject({ category: "PAYMENT", subject: "Charged twice" });
  });

  it("blocks a too-short message", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Subject"), "Hi there");
    await user.type(screen.getByLabelText("Message"), "help");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText(/at least 20 characters/)).toBeInTheDocument();
  });
});
