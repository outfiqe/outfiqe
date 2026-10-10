import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { readSharedPhoto } from "../utils/shareTargetPhoto";
import { useSharedPhoto } from "./useSharedPhoto";

vi.mock("../utils/shareTargetPhoto", () => ({ readSharedPhoto: vi.fn() }));

const renderUseSharedPhoto = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSharedPhoto(), { wrapper });
};

describe("useSharedPhoto", () => {
  it("resolves with the shared photo once read from the cache", async () => {
    const photo = new File(["bytes"], "shared-photo", { type: "image/jpeg" });
    vi.mocked(readSharedPhoto).mockResolvedValue(photo);

    const { result } = renderUseSharedPhoto();

    await waitFor(() => expect(result.current.data).toBe(photo));
  });

  it("resolves with null when nothing was shared", async () => {
    vi.mocked(readSharedPhoto).mockResolvedValue(null);

    const { result } = renderUseSharedPhoto();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
