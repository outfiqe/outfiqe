import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ShareRecipientsList } from "./ShareRecipientsList";

const RECIPIENTS_URL = "/api/outfits/outfit-1/shares";

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const person = (id: string, name: string) => ({ id, name, handle: id, avatarUrl: null });

const renderList = (onRemoveRecipient = vi.fn().mockResolvedValue(true)) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  render(<ShareRecipientsList outfitId="outfit-1" onRemoveRecipient={onRemoveRecipient} />, {
    wrapper: Wrapper,
  });
  return onRemoveRecipient;
};

describe("ShareRecipientsList", () => {
  it("lists who the build was sent to and pages through more", async () => {
    mswServer.use(
      http.get(RECIPIENTS_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return cursor
          ? ok({ items: [person("hari", "Hari")], nextCursor: null })
          : ok({ items: [person("ram", "Ram"), person("gita", "Gita")], nextCursor: "gita" });
      }),
    );
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByText("Ram")).toBeInTheDocument();
    expect(screen.getByText("Gita")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show more" }));

    expect(await screen.findByText("Hari")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("stops sharing with one person and reloads the list", async () => {
    let isRamStillShared = true;
    mswServer.use(
      http.get(RECIPIENTS_URL, () =>
        ok({
          items: isRamStillShared
            ? [person("ram", "Ram"), person("gita", "Gita")]
            : [person("gita", "Gita")],
          nextCursor: null,
        }),
      ),
    );
    const onRemoveRecipient = vi.fn().mockImplementation(() => {
      isRamStillShared = false;
      return Promise.resolve(true);
    });
    const user = userEvent.setup();
    renderList(onRemoveRecipient);

    await user.click(await screen.findByRole("button", { name: "Stop sharing with Ram" }));

    expect(onRemoveRecipient).toHaveBeenCalledWith("ram");
    await waitFor(() => expect(screen.queryByText("Ram")).not.toBeInTheDocument());
    expect(screen.getByText("Gita")).toBeInTheDocument();
  });

  it("says so when the build hasn't been sent to anyone", async () => {
    mswServer.use(http.get(RECIPIENTS_URL, () => ok({ items: [], nextCursor: null })));
    renderList();

    expect(await screen.findByText("You haven't sent it to anyone yet.")).toBeInTheDocument();
  });

  it("explains when the list can't be loaded", async () => {
    mswServer.use(
      http.get(RECIPIENTS_URL, () =>
        HttpResponse.json({ success: false, message: "Nope" }, { status: 500 }),
      ),
    );
    renderList();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load who it was sent to.");
  });
});
