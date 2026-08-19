import { useRouter } from "next/navigation";
import { vi } from "vitest";

export const mockNextRouter = (): { replace: ReturnType<typeof vi.fn> } => {
  const replace = vi.fn();

  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });

  return { replace };
};
