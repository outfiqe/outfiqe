import { Tooltip } from "@outfiqe/design-system";
import { Info } from "lucide-react";

export const CrmTermHint = ({ term, tip }: { term: string; tip: string }) => (
  <span className="inline-flex items-center gap-1">
    {term}
    <Tooltip content={tip}>
      <button
        type="button"
        aria-label={`What ${term} means`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex cursor-help text-muted-foreground"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  </span>
);
