import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthStatus, CreatorStatus, UserRole } from "@/features/auth/types";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { AddPostButton } from "./AddPostButton";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../hooks/useExploreAuthGate", () => ({
  useExploreAuthGate: vi.fn(),
}));
vi.mock("@/features/creator-dashboard/components/PostModal", () => ({
  PostModal: ({ open }: { open: boolean }) => (open ? <div>post-modal</div> : null),
}));
vi.mock("@/features/creator-dashboard/components/ApplyAsCreatorButton", () => ({
  ApplyAsCreatorButton: () => <button type="button">apply</button>,
}));
vi.mock("@outfiqe/design-system", () => ({
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const mockAuth = (role: UserRole, creatorStatus: CreatorStatus) => {
  vi.mocked(useAuth).mockReturnValue({
    state: {
      status: AuthStatus.AUTHENTICATED,
      user: { id: "u1", role, creatorStatus },
      accessToken: "t",
    },
  } as ReturnType<typeof useAuth>);
};

beforeEach(() => {
  vi.mocked(useExploreAuthGate).mockReturnValue({
    isAuthenticated: true,
    isAuthResolved: true,
    goToSignIn: vi.fn(),
    gated: vi.fn(),
  } as ReturnType<typeof useExploreAuthGate>);
});

describe("AddPostButton", () => {
  it("renders nothing for a brand owner", () => {
    mockAuth(UserRole.BRAND_OWNER, CreatorStatus.NONE);

    const { container } = render(<AddPostButton />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Add a post" })).not.toBeInTheDocument();
  });

  it("shows the post button for an approved creator", () => {
    mockAuth(UserRole.CUSTOMER, CreatorStatus.APPROVED);

    render(<AddPostButton />);

    expect(screen.getByRole("button", { name: "Add a post" })).toBeInTheDocument();
  });
});
