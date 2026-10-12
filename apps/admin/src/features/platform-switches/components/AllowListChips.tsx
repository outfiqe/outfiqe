import { X } from "lucide-react";

type AllowListEntry = { id: string; name: string; detail?: string };

type AllowListChipsProps = {
  listLabel: string;
  entries: AllowListEntry[];
  emptyText: string;
  onRemove: (id: string) => void;
};

export const AllowListChips = ({
  listLabel,
  entries,
  emptyText,
  onRemove,
}: AllowListChipsProps) => {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul aria-label={listLabel} className="flex flex-wrap gap-2">
      {entries.map(({ id, name, detail }) => (
        <li
          key={id}
          className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1.5 text-[13px] text-foreground"
        >
          <span>{name}</span>
          {detail && <span className="text-muted-foreground">{detail}</span>}
          <button
            type="button"
            onClick={() => onRemove(id)}
            aria-label={`Remove ${name}`}
            className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
};
