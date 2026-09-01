import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ContactFormModal } from "./ContactFormModal";

const API_BASE = "http://localhost:3000/api";

const renderModal = (contact: Parameters<typeof ContactFormModal>[0]["contact"] = null) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ContactFormModal open onClose={onClose} contact={contact} />
    </QueryClientProvider>,
  );
  return { onClose };
};

describe("ContactFormModal", () => {
  it("creates a contact and closes on success", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
    );
    let postedBody: Record<string, unknown> | null = null;
    mswServer.use(
      http.post(`${API_BASE}/crm/contacts`, async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          data: {
            id: "c-9",
            organizationId: "org-1",
            name: postedBody.name,
            email: null,
            phone: null,
            company: null,
            jobTitle: null,
            lifecycleStage: "LEAD",
            source: null,
            tags: [],
            notes: null,
            linkedUserId: null,
            ownerMembershipId: null,
            ownerName: null,
            linkedUserName: null,
            linkedUserHandle: null,
            createdAt: "2026-09-01T00:00:00.000Z",
            updatedAt: "2026-09-01T00:00:00.000Z",
          },
        });
      }),
    );

    const { onClose } = renderModal();

    await userEvent.type(screen.getByLabelText("Name"), "Rojina Magar");
    await userEvent.click(screen.getByRole("button", { name: "Create contact" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(postedBody).toMatchObject({ name: "Rojina Magar", lifecycleStage: "LEAD" });
  });

  it("surfaces the backend error and stays open", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
      http.post(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json(
          { success: false, code: "CONTACT_EMAIL_TAKEN", message: "That email is already used." },
          { status: 409 },
        ),
      ),
    );

    const { onClose } = renderModal();

    await userEvent.type(screen.getByLabelText("Name"), "Dupe");
    await userEvent.click(screen.getByRole("button", { name: "Create contact" }));

    expect(await screen.findByText(/that email is already used/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
