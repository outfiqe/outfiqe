import { useRouter } from "next/navigation";
import { vi } from "vitest";

export const mockNextRouter = (): {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
} => {
  const push = vi.fn();
  const replace = vi.fn();

  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });

  return { push, replace };
};
