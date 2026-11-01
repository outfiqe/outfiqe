import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
} from "@outfiqe/design-system";
import { X } from "lucide-react";
import { useId, useState } from "react";

export type AuditFilterChoice = { value: string; label: string };

const NO_SELECTION = "";

export const AuditFilterPicker = ({
  label,
  placeholder,
  choices,
  selectedValue,
  isLoading,
  onSelect,
}: {
  label: string;
  placeholder: string;
  choices: AuditFilterChoice[];
  selectedValue: string;
  isLoading: boolean;
  onSelect: (value: string) => void;
}) => {
  const inputId = useId();
  const [typedText, setTypedText] = useState<string | null>(null);

  const selectedLabel =
    choices.find(({ value }) => value === selectedValue)?.label ?? selectedValue;
  const searchText = (typedText ?? "").trim().toLowerCase();
  const matchingChoices = choices.filter((choice) =>
    choice.label.toLowerCase().includes(searchText),
  );

  const pickChoice = (value: string) => {
    onSelect(value);
    setTypedText(null);
  };

  return (
    <div className="w-full space-y-1 sm:w-64">
      <label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Autocomplete>
          <AutocompleteInput
            id={inputId}
            placeholder={placeholder}
            value={typedText ?? selectedLabel}
            onChange={(event) => setTypedText(event.target.value)}
            onBlur={() => setTypedText(null)}
            className="w-full pr-9"
          />
          <AutocompleteContent>
            {isLoading && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Loading choices…
              </p>
            )}
            {!isLoading && matchingChoices.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Nothing matches.
              </p>
            )}
            {matchingChoices.map(({ value, label: choiceLabel }) => (
              <AutocompleteItem key={value} value={value} onSelect={() => pickChoice(value)}>
                <span className="truncate text-[13px] text-foreground">{choiceLabel}</span>
              </AutocompleteItem>
            ))}
          </AutocompleteContent>
        </Autocomplete>
        {selectedValue !== NO_SELECTION && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => pickChoice(NO_SELECTION)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
};
