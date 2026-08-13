import { cn } from "@/shared/lib/cn";

const chipClass = (checked: boolean): string =>
  cn(
    "rounded-full border px-4 py-2 text-sm transition-colors",
    checked
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
  );

type ChipProps = {
  role: "radio" | "checkbox";
  checked: boolean;
  label: string;
  onClick: () => void;
};

const Chip = ({ role, checked, label, onClick }: ChipProps) => (
  <button
    type="button"
    role={role}
    aria-checked={checked}
    onClick={onClick}
    className={chipClass(checked)}
  >
    {label}
  </button>
);

export const ChipGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          role="radio"
          checked={value === opt.value}
          label={opt.label}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
};

export const MultiChipGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) => {
  const toggle = (option: T) => {
    onChange(
      value.includes(option) ? value.filter((selected) => selected !== option) : [...value, option],
    );
  };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          role="checkbox"
          checked={value.includes(opt.value)}
          label={opt.label}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
};
