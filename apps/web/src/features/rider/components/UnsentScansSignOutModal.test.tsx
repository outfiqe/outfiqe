import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLogout } from "@/features/auth";

import { useUnsentScanCount } from "../context/PendingScansContext";
import { useSignOutWithScanCheck } from "../hooks/useSignOutWithScanCheck";
import { UnsentScansSignOutModal } from "./UnsentScansSignOutModal";

vi.mock("@/features/auth", () => ({ useLogout: vi.fn() }));
vi.mock("../context/PendingScansContext", () => ({ useUnsentScanCount: vi.fn() }));

const mutate = vi.fn();

const buildIdleLogoutMutation = (): ReturnType<typeof useLogout> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle",
  variables: undefined,
  submittedAt: 0,
  isError: false,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  mutate,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

const SignOutHarness = () => {
  const signOutCheck = useSignOutWithScanCheck();
  return (
    <>
      <button type="button" onClick={signOutCheck.requestSignOut}>
        Sign out
      </button>
      <UnsentScansSignOutModal signOutCheck={signOutCheck} />
    </>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
});

describe("signing out with scans on the phone", () => {
  it("signs out straight away when every scan has been sent, or for anyone who isn't a rider", () => {
    vi.mocked(useUnsentScanCount).mockReturnValue(0);
    render(<SignOutHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("warns before signing out with scans still waiting", () => {
    vi.mocked(useUnsentScanCount).mockReturnValue(1);
    render(<SignOutHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByText("1 scan still waiting on this phone.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out anyway" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
