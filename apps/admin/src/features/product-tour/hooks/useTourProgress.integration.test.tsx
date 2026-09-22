import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/AuthContext";

import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourProgress } from "./useTourProgress";

const API_BASE = "http://localhost:3000/api";
const ok = (data: unknown) => HttpResponse.json({ success: true, data });

vi.mock("@/features/auth/AuthContext", () => ({ useAuth: vi.fn() }));

const SAVED_TOUR = {
  tourKey: "crm-dashboard",
  version: 1,
  outcome: TOUR_OUTCOME.COMPLETED,
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockAuth = (status: "signed-in" | "signed-out" | "loading") => {
  vi.mocked(useAuth).mockReturnValue({ state: { status } } as ReturnType<typeof useAuth>);
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderProgressAndRecorder = () =>
  renderHook(() => ({ progress: useTourProgress(), recorder: useRecordTourOutcome() }), {
    wrapper,
  });

describe("useTourProgress", () => {
  beforeEach(() => mockAuth("signed-in"));

  it("loads the signed-in staff member's saved tour progress", async () => {
    mswServer.use(http.get(`${API_BASE}/tours/me`, () => ok({ tours: [SAVED_TOUR] })));

    const { result } = renderHook(() => useTourProgress(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tours).toEqual([SAVED_TOUR]);
  });

  it("does not ask the server while signed out", () => {
    mockAuth("signed-out");
    const requested = vi.fn();
    mswServer.use(
      http.get(`${API_BASE}/tours/me`, () => {
        requested();
        return ok({ tours: [] });
      }),
    );

    const { result } = renderHook(() => useTourProgress(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(requested).not.toHaveBeenCalled();
  });
});

describe("useRecordTourOutcome", () => {
  beforeEach(() => mockAuth("signed-in"));

  it("sends the outcome to the server and records it in the cache straight away", async () => {
    const receivedBodies: unknown[] = [];
    mswServer.use(
      http.get(`${API_BASE}/tours/me`, () => ok({ tours: [] })),
      http.put(`${API_BASE}/tours/me/crm-dashboard`, async ({ request }) => {
        receivedBodies.push(await request.json());
        return ok({ ...SAVED_TOUR, outcome: TOUR_OUTCOME.DISMISSED });
      }),
    );
    const { result } = renderProgressAndRecorder();
    await waitFor(() => expect(result.current.progress.isSuccess).toBe(true));

    act(() =>
      result.current.recorder.mutate({
        tourKey: "crm-dashboard",
        version: 1,
        outcome: TOUR_OUTCOME.DISMISSED,
      }),
    );

    await waitFor(() =>
      expect(result.current.progress.data?.tours).toEqual([
        expect.objectContaining({ tourKey: "crm-dashboard", outcome: TOUR_OUTCOME.DISMISSED }),
      ]),
    );
    await waitFor(() =>
      expect(receivedBodies).toEqual([{ version: 1, outcome: TOUR_OUTCOME.DISMISSED }]),
    );
  });

  it("keeps the outcome in the cache when saving fails, so the tour does not reopen", async () => {
    mswServer.use(
      http.get(`${API_BASE}/tours/me`, () => ok({ tours: [] })),
      http.put(`${API_BASE}/tours/me/crm-dashboard`, () =>
        HttpResponse.json({ success: false, data: null }, { status: 500 }),
      ),
    );
    const { result } = renderProgressAndRecorder();
    await waitFor(() => expect(result.current.progress.isSuccess).toBe(true));

    act(() =>
      result.current.recorder.mutate({
        tourKey: "crm-dashboard",
        version: 1,
        outcome: TOUR_OUTCOME.COMPLETED,
      }),
    );

    await waitFor(() => expect(result.current.recorder.isError).toBe(true));
    expect(result.current.progress.data?.tours).toEqual([
      expect.objectContaining({ tourKey: "crm-dashboard", outcome: TOUR_OUTCOME.COMPLETED }),
    ]);
  });
});
