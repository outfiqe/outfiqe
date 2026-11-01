import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateInput } from "./date-input";

const stubCalendarOpener = () => {
  const showPicker = vi.fn();
  Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
    configurable: true,
    value: showPicker,
  });
  return showPicker;
};

describe("DateInput", () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLInputElement.prototype, "showPicker");
  });

  it("is a date box by default and passes its value straight through", () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="Ends on" value="2026-10-31" onChange={onChange} />);

    const input = screen.getByLabelText("Ends on");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveValue("2026-10-31");

    fireEvent.change(input, { target: { value: "2026-11-01" } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("asks for a time as well when told to", () => {
    render(<DateInput aria-label="Starts at" includesTime />);

    expect(screen.getByLabelText("Starts at")).toHaveAttribute("type", "datetime-local");
  });

  it("opens the calendar when clicked anywhere and still calls the caller", () => {
    const showPicker = stubCalendarOpener();
    const onClick = vi.fn();
    render(<DateInput aria-label="Ends on" onClick={onClick} />);

    fireEvent.click(screen.getByLabelText("Ends on"));

    expect(onClick).toHaveBeenCalledOnce();
    expect(showPicker).toHaveBeenCalledOnce();
  });

  it("leaves a read-only box alone", () => {
    const showPicker = stubCalendarOpener();
    render(<DateInput aria-label="Ends on" readOnly />);

    fireEvent.click(screen.getByLabelText("Ends on"));

    expect(showPicker).not.toHaveBeenCalled();
  });

  it("still works in a browser with no calendar opener", () => {
    render(<DateInput aria-label="Ends on" />);

    expect(() => fireEvent.click(screen.getByLabelText("Ends on"))).not.toThrow();
  });
});
