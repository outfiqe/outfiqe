import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { useTastePreferences } from "./useTastePreferences";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const STORAGE_KEY = "outfiqe:taste-categories";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const mockAuth = (signedIn: boolean) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: signedIn,
    isAuthResolved: true,
  } as ReturnType<typeof useAuth>);
};

describe("useTastePreferences — anonymous", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuth(false);
  });

  it("reads and writes only localStorage", async () => {
    const { result } = renderHook(() => useTastePreferences(), { wrapper });
    expect(result.current.isCustomized).toBe(false);

    act(() => result.current.save(["b", "a"]));

    expect(result.current.storedSlugs).toEqual(["b", "a"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(["b", "a"]);

    act(() => result.current.reset());
    expect(result.current.storedSlugs).toBeNull();
  });

  it("ignores a malformed stored value", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    const { result } = renderHook(() => useTastePreferences(), { wrapper });
    expect(result.current.isCustomized).toBe(false);
  });
});

describe("useTastePreferences — signed in", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuth(true);
  });

  it("prefers the server record over localStorage", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["local-a"]));
    mswServer.use(
      http.get("/api/taste-preferences/me", () =>
        HttpResponse.json({ success: true, message: "ok", data: { categorySlugs: ["server-x"] } }),
      ),
    );

    const { result } = renderHook(() => useTastePreferences(), { wrapper });

    await waitFor(() => expect(result.current.storedSlugs).toEqual(["server-x"]));
  });

  it("pushes a local-only choice up to the server on first sign-in", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["merge-me"]));
    let putBody: unknown;
    mswServer.use(
      http.get("/api/taste-preferences/me", () =>
        HttpResponse.json({ success: true, message: "ok", data: { categorySlugs: null } }),
      ),
      http.put("/api/taste-preferences/me", async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { categorySlugs: ["merge-me"] },
        });
      }),
    );

    renderHook(() => useTastePreferences(), { wrapper });

    await waitFor(() => expect(putBody).toEqual({ categorySlugs: ["merge-me"] }));
  });

  it("clears the server record and localStorage on reset", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["existing"]));
    let deleteCalled = false;
    mswServer.use(
      http.get("/api/taste-preferences/me", () =>
        HttpResponse.json({ success: true, message: "ok", data: { categorySlugs: ["existing"] } }),
      ),
      http.delete("/api/taste-preferences/me", () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, message: "ok", data: { categorySlugs: null } });
      }),
    );

    const { result } = renderHook(() => useTastePreferences(), { wrapper });
    await waitFor(() => expect(result.current.storedSlugs).toEqual(["existing"]));

    act(() => result.current.reset());

    await waitFor(() => expect(deleteCalled).toBe(true));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("writes both the server and localStorage on save", async () => {
    let putBody: unknown;
    mswServer.use(
      http.get("/api/taste-preferences/me", () =>
        HttpResponse.json({ success: true, message: "ok", data: { categorySlugs: ["existing"] } }),
      ),
      http.put("/api/taste-preferences/me", async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { categorySlugs: ["new"] },
        });
      }),
    );

    const { result } = renderHook(() => useTastePreferences(), { wrapper });
    await waitFor(() => expect(result.current.storedSlugs).toEqual(["existing"]));

    act(() => result.current.save(["new"]));

    await waitFor(() => expect(putBody).toEqual({ categorySlugs: ["new"] }));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(["new"]);
  });
});
