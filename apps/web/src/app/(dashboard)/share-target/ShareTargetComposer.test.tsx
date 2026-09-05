import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";
import { useSharedPhoto } from "@/features/pwa";

import { ShareTargetComposer } from "./ShareTargetComposer";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/features/pwa", () => ({ useSharedPhoto: vi.fn() }));

vi.mock("@/features/creator-dashboard/components/ApplyAsCreatorButton", () => ({
  ApplyAsCreatorButton: () => <button type="button">Apply now</button>,
}));

vi.mock("@/features/creator-dashboard/components/PostModal", () => ({
  PostModal: ({ initialPhotoFile }: { initialPhotoFile?: File | null }) => (
    <div data-testid="post-modal">{initialPhotoFile?.name}</div>
  ),
}));

const sharedPhotoQuery = (
  overrides: Partial<ReturnType<typeof useSharedPhoto>> = {},
): ReturnType<typeof useSharedPhoto> =>
  ({
    data: null,
    isLoading: false,
    ...overrides,
  }) as ReturnType<typeof useSharedPhoto>;

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

describe("ShareTargetComposer", () => {
  it("renders nothing while the shared photo is still being read", () => {
    vi.mocked(useSharedPhoto).mockReturnValue(sharedPhotoQuery({ isLoading: true }));

    const { container } = render(<ShareTargetComposer creatorStatus={CreatorStatus.APPROVED} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tells someone whose application is pending to wait", () => {
    vi.mocked(useSharedPhoto).mockReturnValue(sharedPhotoQuery());

    render(<ShareTargetComposer creatorStatus={CreatorStatus.PENDING} />);

    expect(screen.getByText("Application under review")).toBeInTheDocument();
  });

  it("asks someone who isn't a creator yet to apply", () => {
    vi.mocked(useSharedPhoto).mockReturnValue(sharedPhotoQuery());

    render(<ShareTargetComposer creatorStatus={CreatorStatus.NONE} />);

    expect(screen.getByRole("button", { name: "Apply now" })).toBeInTheDocument();
  });

  it("explains that nothing was shared when an approved creator arrives with no photo", () => {
    vi.mocked(useSharedPhoto).mockReturnValue(sharedPhotoQuery({ data: null }));

    render(<ShareTargetComposer creatorStatus={CreatorStatus.APPROVED} />);

    expect(screen.getByText("Nothing was shared")).toBeInTheDocument();
  });

  it("opens the compose modal pre-loaded with the shared photo for an approved creator", () => {
    const sharedPhoto = new File(["bytes"], "shared-photo", { type: "image/jpeg" });
    vi.mocked(useSharedPhoto).mockReturnValue(sharedPhotoQuery({ data: sharedPhoto }));

    render(<ShareTargetComposer creatorStatus={CreatorStatus.APPROVED} />);

    expect(screen.getByTestId("post-modal")).toHaveTextContent("shared-photo");
  });
});
