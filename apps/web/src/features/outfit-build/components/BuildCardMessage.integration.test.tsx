import type { Message } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { buildBoard, SITA } from "../testing/outfitFixtures";
import { BuildCardMessage } from "./BuildCardMessage";

const cardMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "message-1",
  conversationId: "conversation-1",
  senderId: SITA.id,
  sender: SITA,
  kind: "OUTFIT_CARD",
  systemEvent: null,
  outfitId: "outfit-1",
  body: null,
  attachments: [],
  createdAt: "2026-09-30T10:00:00.000Z",
  isMine: false,
  isDeliveredToOthers: false,
  isReadByOthers: false,
  ...overrides,
});

const renderCard = (message: Message) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<BuildCardMessage message={message} />, { wrapper: Wrapper });
};

describe("BuildCardMessage", () => {
  it("shows the build live, with who started it and a link to open it", async () => {
    mswServer.use(
      http.get("/api/outfits/outfit-1", () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { ...buildBoard({ total: 7_450, isFullyAvailable: false }), kind: "board" },
        }),
      ),
    );

    renderCard(cardMessage());

    expect(screen.getByText("Sita Rai started an outfit build")).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: /Dashain look/ });
    expect(link).toHaveAttribute("href", "/builds/outfit-1");
    expect(screen.getByText("0 items · Rs 7,450")).toBeInTheDocument();
  });

  it("says so when the build can't be opened", async () => {
    mswServer.use(
      http.get("/api/outfits/outfit-1", () =>
        HttpResponse.json({ success: false, message: "Build not found." }, { status: 404 }),
      ),
    );

    renderCard(cardMessage({ isMine: true }));

    expect(screen.getByText("You started an outfit build")).toBeInTheDocument();
    expect(await screen.findByText("This build isn't available.")).toBeInTheDocument();
  });
});
