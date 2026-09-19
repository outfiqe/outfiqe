import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PostCarousel } from "./PostCarousel";

beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PostCarousel", () => {
  it("likes the post on a double tap without opening the detail view", () => {
    const onImageClick = vi.fn();
    const onDoubleTapLike = vi.fn();
    const { container } = render(
      <PostCarousel
        images={["https://cdn.test/look.jpg"]}
        fallbackColor="#000"
        onImageClick={onImageClick}
        onDoubleTapLike={onDoubleTapLike}
      />,
    );
    const tappable = container.firstElementChild as HTMLElement;

    fireEvent.click(tappable);
    fireEvent.click(tappable);

    expect(onDoubleTapLike).toHaveBeenCalledOnce();
    expect(onImageClick).not.toHaveBeenCalled();
  });

  it("opens the detail view on a single tap once no second tap follows in time", () => {
    vi.useFakeTimers();
    const onImageClick = vi.fn();
    const onDoubleTapLike = vi.fn();
    const { container } = render(
      <PostCarousel
        images={["https://cdn.test/look.jpg"]}
        fallbackColor="#000"
        onImageClick={onImageClick}
        onDoubleTapLike={onDoubleTapLike}
      />,
    );
    const tappable = container.firstElementChild as HTMLElement;

    fireEvent.click(tappable);
    expect(onImageClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onImageClick).toHaveBeenCalledOnce();
    expect(onDoubleTapLike).not.toHaveBeenCalled();
  });

  it("does nothing on a double tap when no like handler is given", () => {
    const onImageClick = vi.fn();
    const { container } = render(
      <PostCarousel
        images={["https://cdn.test/look.jpg"]}
        fallbackColor="#000"
        onImageClick={onImageClick}
      />,
    );
    const tappable = container.firstElementChild as HTMLElement;

    fireEvent.click(tappable);
    fireEvent.click(tappable);

    expect(onImageClick).not.toHaveBeenCalled();
  });
});
