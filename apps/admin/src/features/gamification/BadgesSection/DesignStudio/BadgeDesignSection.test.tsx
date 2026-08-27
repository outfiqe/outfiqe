import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { EMPTY_FORM } from "../badgeForm.constants";
import type { BadgeFormState } from "../badgeForm.types";
import { BadgeDesignSection } from "./BadgeDesignSection";

const Harness = ({ initialForm = EMPTY_FORM }: { initialForm?: BadgeFormState }) => {
  const [form, setForm] = useState<BadgeFormState>(initialForm);
  return (
    <>
      <BadgeDesignSection idPrefix="test" form={form} onChange={setForm} />
      <output data-testid="mode">{form.designMode}</output>
      <output data-testid="layer-count">{form.studioLayers.length}</output>
      <output data-testid="animation">{form.animation}</output>
      <output data-testid="layer-types">
        {form.studioLayers.map((layer) => layer.type).join(",")}
      </output>
    </>
  );
};

describe("BadgeDesignSection", () => {
  it("starts in simple mode with the shape control visible", () => {
    render(<Harness />);
    expect(screen.getByTestId("mode")).toHaveTextContent("simple");
    expect(screen.getByLabelText("Shape")).toBeInTheDocument();
  });

  it("seeds a background layer when switching to studio mode", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Studio \(layers\)/ }));

    expect(screen.getByTestId("mode")).toHaveTextContent("studio");
    expect(screen.getByTestId("layer-count")).toHaveTextContent("1");
    expect(screen.getByTestId("layer-types")).toHaveTextContent("background");
  });

  it("adds an image layer from the studio toolbar", async () => {
    render(<Harness initialForm={{ ...EMPTY_FORM, designMode: "studio" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Image" }));

    expect(screen.getByTestId("layer-types")).toHaveTextContent("image");
  });

  it("clears layers when switching back to simple mode", async () => {
    render(
      <Harness
        initialForm={{
          ...EMPTY_FORM,
          designMode: "studio",
          studioLayers: [
            {
              id: "bg",
              type: "background",
              shape: "circle",
              fill: "#000",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
          ],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    expect(screen.getByTestId("mode")).toHaveTextContent("simple");
    expect(screen.getByTestId("layer-count")).toHaveTextContent("0");
  });

  it("updates the animation from the dropdown", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText("Animation"), "shimmer");
    expect(screen.getByTestId("animation")).toHaveTextContent("shimmer");
  });

  it("changes the shape and colour in simple mode", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText("Shape"), "star");
    expect(screen.getByLabelText("Shape")).toHaveValue("star");

    const colourInput = screen.getByLabelText("Color") as HTMLInputElement;
    colourInput.value = "#123456";
    colourInput.dispatchEvent(new Event("input", { bubbles: true }));
    expect(colourInput.value).toBe("#123456");
  });

  it("hides the colour picker once a custom image is set in simple mode", () => {
    render(<Harness initialForm={{ ...EMPTY_FORM, iconImageUrl: "https://cdn.test/i.png" }} />);
    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
  });

  it("selects a layer in studio mode and shows its properties, then removes it", async () => {
    render(
      <Harness
        initialForm={{
          ...EMPTY_FORM,
          designMode: "studio",
          studioLayers: [
            {
              id: "bg",
              type: "background",
              shape: "circle",
              fill: "#000",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
            {
              id: "txt",
              type: "text",
              content: "HELLO",
              color: "#fff",
              fontSize: 20,
              fontWeight: "bold",
              x: 10,
              y: 60,
              width: 80,
              height: 20,
            },
          ],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "HELLO" }));
    expect(screen.getByLabelText("Text")).toHaveValue("HELLO");

    const removeButtons = screen.getAllByRole("button", { name: "Remove layer" });
    await userEvent.click(removeButtons[removeButtons.length - 1]!);
    expect(screen.getByTestId("layer-count")).toHaveTextContent("1");
  });

  it("edits a selected layer's property and the studio animation", async () => {
    render(
      <Harness
        initialForm={{
          ...EMPTY_FORM,
          designMode: "studio",
          animation: "auto",
          studioLayers: [
            {
              id: "txt",
              type: "text",
              content: "OLD",
              color: "#fff",
              fontSize: 20,
              fontWeight: "normal",
              x: 10,
              y: 60,
              width: 80,
              height: 20,
            },
          ],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "OLD" }));
    const textField = screen.getByLabelText("Text");
    await userEvent.clear(textField);
    await userEvent.type(textField, "NEW");
    expect(screen.getByRole("button", { name: "NEW" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Animation"), "pulse");
    expect(screen.getByTestId("animation")).toHaveTextContent("pulse");
  });

  it("adds icon and text layers from the studio toolbar", async () => {
    render(<Harness initialForm={{ ...EMPTY_FORM, designMode: "studio" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    await userEvent.click(screen.getByRole("button", { name: "Text" }));
    await userEvent.click(screen.getByRole("button", { name: "Background" }));
    expect(screen.getByTestId("layer-types")).toHaveTextContent("icon,text,background");
  });
});
