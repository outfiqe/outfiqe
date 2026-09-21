import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourProgress } from "./useTourProgress";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const SAVED_TOUR = {
  tourKey: "brand-dashboard",
  version: 1,
  outcome: TOUR_OUTCOME.COMPLETED,
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const envelope = <T,>(data: T) => ({ success: true, message: "ok", data });

const mockAuth = (isAuthenticated: boolean) => {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated } as ReturnType<typeof useAuth>);
};

const renderProgressAndRecorder = () =>
  renderHook(() => ({ progress: useTourProgress(), recorder: useRecordTourOutcome() }), {
    wrapper: createQueryClientWrapper(),
  });

describe("useTourProgress", () => {
  beforeEach(() => mockAuth(true));

  it("loads the signed-in user's saved tour progress", async () => {
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [SAVED_TOUR] }))),
    );

    const { result } = renderHook(() => useTourProgress(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tours).toEqual([SAVED_TOUR]);
  });

  it("does not ask the server while signed out", () => {
    mockAuth(false);
    const requested = vi.fn();
    mswServer.use(
      http.get("/api/tours/me", () => {
        requested();
        return HttpResponse.json(envelope({ tours: [] }));
      }),
    );

    const { result } = renderHook(() => useTourProgress(), { wrapper: createQueryClientWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(requested).not.toHaveBeenCalled();
  });

  it("errors instead of guessing when the server sends an unexpected shape", async () => {
    mswServer.use(http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: "nope" }))));

    const { result } = renderHook(() => useTourProgress(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRecordTourOutcome", () => {
  beforeEach(() => mockAuth(true));

  it("sends the outcome to the server and records it in the cache straight away", async () => {
    const receivedBodies: unknown[] = [];
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [] }))),
      http.put("/api/tours/me/brand-dashboard", async ({ request }) => {
        receivedBodies.push(await request.json());
        return HttpResponse.json(envelope({ ...SAVED_TOUR, outcome: TOUR_OUTCOME.DISMISSED }));
      }),
    );
    const { result } = renderProgressAndRecorder();
    await waitFor(() => expect(result.current.progress.isSuccess).toBe(true));

    act(() =>
      result.current.recorder.mutate({
        tourKey: "brand-dashboard",
        version: 1,
        outcome: TOUR_OUTCOME.DISMISSED,
      }),
    );

    await waitFor(() =>
      expect(result.current.progress.data?.tours).toEqual([
        expect.objectContaining({ tourKey: "brand-dashboard", outcome: TOUR_OUTCOME.DISMISSED }),
      ]),
    );
    await waitFor(() =>
      expect(receivedBodies).toEqual([{ version: 1, outcome: TOUR_OUTCOME.DISMISSED }]),
    );
  });

  it("keeps the outcome in the cache when saving fails, so the tour does not reopen", async () => {
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [] }))),
      http.put("/api/tours/me/brand-dashboard", () =>
        HttpResponse.json({ success: false, message: "Server error", data: null }, { status: 500 }),
      ),
    );
    const { result } = renderProgressAndRecorder();
    await waitFor(() => expect(result.current.progress.isSuccess).toBe(true));

    act(() =>
      result.current.recorder.mutate({
        tourKey: "brand-dashboard",
        version: 1,
        outcome: TOUR_OUTCOME.COMPLETED,
      }),
    );

    await waitFor(() => expect(result.current.recorder.isError).toBe(true));
    expect(result.current.progress.data?.tours).toEqual([
      expect.objectContaining({ tourKey: "brand-dashboard", outcome: TOUR_OUTCOME.COMPLETED }),
    ]);
  });
});
