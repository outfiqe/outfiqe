import { Button, Input } from "@outfiqe/design-system";
import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

type CityListInputProps = {
  cities: string[];
  onChange: (cities: string[]) => void;
};

export const CityListInput = ({ cities, onChange }: CityListInputProps) => {
  const [draft, setDraft] = useState("");

  const addCity = () => {
    const trimmed = draft.trim();
    const alreadyListed = cities.some((city) => city.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !alreadyListed) onChange([...cities, trimmed]);
    setDraft("");
  };

  const removeCity = (city: string) => onChange(cities.filter((c) => c !== city));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCity();
  };

  return (
    <div className="space-y-2">
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cities.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {city}
              <button
                type="button"
                onClick={() => removeCity(city)}
                aria-label={`Remove ${city}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a city and press Enter"
          className="w-56"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCity}>
          Add
        </Button>
      </div>
    </div>
  );
};
