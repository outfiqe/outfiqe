import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/overview";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ isAuthenticated: false, state: { user: null } }),
}));

vi.mock("@/shared/lib/socketClient", () => ({
  getSocket: vi.fn(),
  acquireSocketConnection: vi.fn(),
  releaseSocketConnection: vi.fn(),
}));

vi.mock("@outfiqe/hooks", () => ({
  toEventSocket: () => null,
  useConversationSocket: vi.fn(),
  usePresenceSocket: vi.fn(),
  useConversationRoomSubscription: vi.fn(),
  useStartConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ChatPanelProvider, useChatPanel } from "./ChatPanelContext";

const ChatPanelProbe = () => {
  const { isOpen, openList, close } = useChatPanel();
  return (
    <div>
      <span data-testid="panel-state">{isOpen ? "open" : "closed"}</span>
      <button onClick={openList}>Open list</button>
      <button onClick={close}>Close</button>
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const buildProbeTree = () => (
  <QueryClientProvider client={queryClient}>
    <ChatPanelProvider>
      <ChatPanelProbe />
    </ChatPanelProvider>
  </QueryClientProvider>
);

const renderChatPanelProbe = () => {
  const view = render(buildProbeTree());
  return { ...view, rerenderProbe: () => view.rerender(buildProbeTree()) };
};

describe("ChatPanelProvider", () => {
  afterEach(() => {
    mockPathname = "/overview";
  });

  it("closes the panel when the pathname changes", () => {
    const { rerenderProbe } = renderChatPanelProbe();

    fireEvent.click(screen.getByText("Open list"));
    expect(screen.getByTestId("panel-state")).toHaveTextContent("open");

    mockPathname = "/messages";
    rerenderProbe();

    expect(screen.getByTestId("panel-state")).toHaveTextContent("closed");
  });

  it("keeps the panel open across a rerender on the same pathname", () => {
    const { rerenderProbe } = renderChatPanelProbe();

    fireEvent.click(screen.getByText("Open list"));
    expect(screen.getByTestId("panel-state")).toHaveTextContent("open");

    rerenderProbe();

    expect(screen.getByTestId("panel-state")).toHaveTextContent("open");
  });
});
