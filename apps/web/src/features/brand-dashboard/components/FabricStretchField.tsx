"use client";

import { RadioGroup } from "@outfiqe/design-system";

const FABRIC_STRETCH = {
  STRETCHABLE: "STRETCHABLE",
  NON_STRETCH: "NON_STRETCH",
} as const;

type FabricStretch = (typeof FABRIC_STRETCH)[keyof typeof FABRIC_STRETCH];

const FABRIC_STRETCH_OPTIONS = [
  {
    value: FABRIC_STRETCH.STRETCHABLE,
    label: "Stretchable",
    description: "Gives a little, so shoppers at the edge of a size can pick the smaller one.",
  },
  {
    value: FABRIC_STRETCH.NON_STRETCH,
    label: "Non-stretch",
    description: "Doesn't give, so shoppers at the edge of a size should size up.",
  },
];

const toFabricStretch = (isStretchable: boolean | null): FabricStretch | null => {
  if (isStretchable === null) return null;
  return isStretchable ? FABRIC_STRETCH.STRETCHABLE : FABRIC_STRETCH.NON_STRETCH;
};

type FabricStretchFieldProps = {
  value: boolean | null;
  onChange: (isStretchable: boolean) => void;
};

export const FabricStretchField = ({ value, onChange }: FabricStretchFieldProps) => (
  <RadioGroup
    legend="Fabric stretch"
    isLegendVisible
    options={FABRIC_STRETCH_OPTIONS}
    value={toFabricStretch(value)}
    onChange={(fabricStretch) => onChange(fabricStretch === FABRIC_STRETCH.STRETCHABLE)}
  />
);
