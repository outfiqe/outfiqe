import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreatorSuggestion, PostSuggestion } from "../api/exploreSearchSchemas";
import { useExploreAutocomplete } from "../hooks/useExploreAutocomplete";
import { ExploreSearchBox } from "./ExploreSearchBox";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("../hooks/useExploreAutocomplete", () => ({
  useExploreAutocomplete: vi.fn(),
}));

const push = vi.fn();

const mockSuggestions = ({
  creators = [],
  posts = [],
  isLoading = false,
}: {
  creators?: CreatorSuggestion[];
  posts?: PostSuggestion[];
  isLoading?: boolean;
}) => {
  vi.mocked(useExploreAutocomplete).mockReturnValue({ creators, posts, isLoading });
};

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  push.mockClear();
  mockSuggestions({});
});

const renderBox = () =>
  render(<ExploreSearchBox placeholder="Search creators & posts" formClassName="" />);

describe("ExploreSearchBox", () => {
  it("renders creators and posts as two labeled groups", async () => {
    mockSuggestions({
      creators: [
        { userId: "u1", name: "Ava Martinez", handle: "ava", avatarUrl: null, followerCount: 10 },
      ],
      posts: [
        {
          id: "p1",
          imageUrl: "https://cdn.test/p1.jpg",
          caption: "Winter layers",
          creator: { name: "Ava Martinez", handle: "ava" },
        },
      ],
    });

    const user = userEvent.setup();
    renderBox();
    await user.type(screen.getByPlaceholderText("Search creators & posts"), "ava");

    expect(await screen.findByText("Creators")).toBeInTheDocument();
    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("Ava Martinez")).toBeInTheDocument();
    expect(screen.getByText("Winter layers")).toBeInTheDocument();
  });

  it("shows an empty state when neither creators nor posts match", async () => {
    mockSuggestions({ creators: [], posts: [] });

    const user = userEvent.setup();
    renderBox();
    await user.type(screen.getByPlaceholderText("Search creators & posts"), "zzz");

    expect(await screen.findByText(/No creators or posts found/)).toBeInTheDocument();
  });

  it("navigates to the creator's profile when a creator suggestion is selected", async () => {
    mockSuggestions({
      creators: [
        { userId: "u1", name: "Ava Martinez", handle: "ava", avatarUrl: null, followerCount: 10 },
      ],
    });

    const user = userEvent.setup();
    renderBox();
    await user.type(screen.getByPlaceholderText("Search creators & posts"), "ava");

    await user.click(await screen.findByText("Ava Martinez"));

    expect(push).toHaveBeenCalledWith("/creator/ava");
  });

  it("navigates to the post's creator profile when a post suggestion is selected", async () => {
    mockSuggestions({
      posts: [
        {
          id: "p1",
          imageUrl: "https://cdn.test/p1.jpg",
          caption: "Winter layers",
          creator: { name: "Ava Martinez", handle: "ava" },
        },
      ],
    });

    const user = userEvent.setup();
    renderBox();
    await user.type(screen.getByPlaceholderText("Search creators & posts"), "winter");

    await user.click(await screen.findByText("Winter layers"));

    expect(push).toHaveBeenCalledWith("/creator/ava");
  });

  it("falls through to the full results page on submit with nothing highlighted", async () => {
    const user = userEvent.setup();
    renderBox();
    const input = screen.getByPlaceholderText("Search creators & posts");
    await user.type(input, "ava{Enter}");

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/explore/search?q=${encodeURIComponent("ava")}`),
    );
  });
});
