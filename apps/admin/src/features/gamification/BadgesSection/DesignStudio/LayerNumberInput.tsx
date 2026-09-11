import { Input } from "@outfiqe/design-system";
import { useState } from "react";

type LayerNumberInputProps = {
  id: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  className?: string;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const LayerNumberInput = ({
  id,
  value,
  min,
  max,
  onCommit,
  className,
}: LayerNumberInputProps) => {
  const [draft, setDraft] = useState(String(value));

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "") return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onCommit(clamp(parsed, min, max));
  };

  return (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => setDraft(String(value))}
      className={className}
    />
  );
};
