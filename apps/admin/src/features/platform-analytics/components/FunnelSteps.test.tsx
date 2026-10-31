import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FunnelSteps } from "./FunnelSteps";

const EMPTY_MESSAGE = "No product views in this range yet.";

const renderSteps = (personsPerStep: number[]) =>
  render(
    <FunnelSteps
      steps={personsPerStep.map((persons, stepIndex) => ({
        event: `step-${stepIndex}`,
        persons,
      }))}
      emptyMessage={EMPTY_MESSAGE}
    />,
  );

describe("FunnelSteps", () => {
  it("shows each step as a share of the step before it", () => {
    renderSteps([200, 50]);

    expect(screen.getByText("25.0% carried on")).toBeInTheDocument();
    expect(screen.getAllByText(/carried on/)).toHaveLength(1);
  });

  it("shows no share when the step before it has nobody to compare with", () => {
    renderSteps([1, 0, 1]);

    expect(screen.getByText("0.0% carried on")).toBeInTheDocument();
    expect(screen.getAllByText(/carried on/)).toHaveLength(1);
  });

  it("shows the empty message when nobody reached the first step", () => {
    renderSteps([0, 0]);

    expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
  });
});
