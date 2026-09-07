import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteGroup,
  AutocompleteInput,
  AutocompleteItem,
} from "./autocomplete";

const CITIES = ["Kathmandu", "Lalitpur", "Pokhara"];

type HarnessProps = {
  onSelect: (city: string) => void;
  closeOnSelect?: boolean;
  autoHighlightFirst?: boolean;
  disabledCity?: string;
};

const CityHarness = ({
  onSelect,
  closeOnSelect,
  autoHighlightFirst,
  disabledCity,
}: HarnessProps) => {
  const [query, setQuery] = useState("");
  const matches = CITIES.filter((city) => city.toLowerCase().includes(query.toLowerCase()));

  return (
    <Autocomplete closeOnSelect={closeOnSelect} autoHighlightFirst={autoHighlightFirst}>
      <AutocompleteInput
        aria-label="City"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.length > 0 && (
        <AutocompleteContent>
          <AutocompleteGroup label="Cities">
            {matches.map((city) => (
              <AutocompleteItem
                key={city}
                value={city}
                disabled={city === disabledCity}
                onSelect={() => onSelect(city)}
              >
                {city}
              </AutocompleteItem>
            ))}
          </AutocompleteGroup>
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};

const typeQuery = (value: string): HTMLElement => {
  const input = screen.getByLabelText("City");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Autocomplete", () => {
  it("opens the listbox as the user types and renders the grouped options", () => {
    render(<CityHarness onSelect={vi.fn()} />);

    typeQuery("la");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Cities")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lalitpur" })).toBeInTheDocument();
  });

  it("prevents the mousedown default on an option so the input never loses focus to it", () => {
    render(<CityHarness onSelect={vi.fn()} />);

    typeQuery("kath");
    const option = screen.getByRole("option", { name: "Kathmandu" });
    const mousedown = createEvent.mouseDown(option);
    fireEvent(option, mousedown);

    expect(mousedown.defaultPrevented).toBe(true);
  });

  it("commits an option on a single click and closes the listbox", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} />);

    typeQuery("kath");
    fireEvent.click(screen.getByRole("option", { name: "Kathmandu" }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("Kathmandu");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores clicks on a disabled option", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} disabledCity="Pokhara" />);

    typeQuery("po");
    fireEvent.click(screen.getByRole("option", { name: "Pokhara" }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("navigates with the arrow keys and selects the active option on Enter", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} />);

    const input = typeQuery("a");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("Lalitpur");
  });

  it("wraps to the last option when ArrowUp is pressed from the first", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} />);

    const input = typeQuery("a");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("Pokhara");
  });

  it("jumps to the first and last option with Home and End", () => {
    render(<CityHarness onSelect={vi.fn()} />);

    const input = typeQuery("a");
    fireEvent.keyDown(input, { key: "End" });
    expect(screen.getByRole("option", { name: "Pokhara" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "Home" });
    expect(screen.getByRole("option", { name: "Kathmandu" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("closes on Escape without selecting anything", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} />);

    const input = typeQuery("kath");
    const escape = createEvent.keyDown(input, { key: "Escape" });
    fireEvent(input, escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the listbox open after selection when closeOnSelect is false", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} closeOnSelect={false} />);

    typeQuery("kath");
    fireEvent.click(screen.getByRole("option", { name: "Kathmandu" }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("Kathmandu");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders an empty listbox and ignores arrow keys when nothing matches", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} />);

    const input = typeQuery("zzz");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("highlights an option on hover", () => {
    render(<CityHarness onSelect={vi.fn()} />);

    typeQuery("a");
    fireEvent.mouseEnter(screen.getByRole("option", { name: "Pokhara" }));

    expect(screen.getByRole("option", { name: "Pokhara" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does nothing on Enter when no option is highlighted", () => {
    const onSelect = vi.fn();
    render(<CityHarness onSelect={onSelect} autoHighlightFirst={false} />);

    const input = typeQuery("a");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("leaves unrelated keys to the browser", () => {
    render(<CityHarness onSelect={vi.fn()} />);

    const input = typeQuery("a");
    const tab = createEvent.keyDown(input, { key: "Tab" });
    fireEvent(input, tab);

    expect(tab.defaultPrevented).toBe(false);
  });

  it("does not pre-highlight an option when autoHighlightFirst is false", () => {
    render(<CityHarness onSelect={vi.fn()} autoHighlightFirst={false} />);

    typeQuery("a");

    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("aria-selected", "false");
    }
  });
});
