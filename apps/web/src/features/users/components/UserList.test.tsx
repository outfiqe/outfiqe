import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUsers } from "../hooks/useUsers";
import { UserList } from "./UserList";

vi.mock("../hooks/useUsers", () => ({
  useUsers: vi.fn(),
}));

const mockUsersQuery = (overrides: Partial<ReturnType<typeof useUsers>>) => {
  vi.mocked(useUsers).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useUsers>);
};

beforeEach(() => {
  mockUsersQuery({ isLoading: true });
});

describe("UserList", () => {
  it("renders skeleton rows while loading", () => {
    mockUsersQuery({ isLoading: true });

    const { container } = render(<UserList />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });

  it("renders an error message when the request fails", () => {
    mockUsersQuery({ isError: true });

    render(<UserList />);

    expect(screen.getByText("Failed to load users.")).toBeInTheDocument();
  });

  it("renders a row per user once loaded", () => {
    mockUsersQuery({
      data: [
        { id: "u1", name: "Ada", email: "ada@example.com", createdAt: "2026-01-01T00:00:00.000Z" },
        {
          id: "u2",
          name: "Bram",
          email: "bram@example.com",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    render(<UserList />);

    expect(screen.getByText("Ada — ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bram — bram@example.com")).toBeInTheDocument();
  });
});
