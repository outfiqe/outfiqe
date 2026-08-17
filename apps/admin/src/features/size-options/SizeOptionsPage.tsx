import { Badge, Button, FormBanner, Input } from "@outfiqe/design-system";
import { PRODUCT_TYPE_SLUGS } from "@outfiqe/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { sizeOptionsApi } from "./api";
import type { ProductTypeSlug, SizeOption } from "./schemas";

const humanizeType = (type: ProductTypeSlug): string =>
  type.charAt(0).toUpperCase() + type.slice(1);

export const SizeOptionsPage = () => {
  const queryClient = useQueryClient();
  const { data: sizeOptions, isLoading } = useQuery({
    queryKey: ["admin-size-options"],
    queryFn: sizeOptionsApi.list,
  });

  const [type, setType] = useState<ProductTypeSlug>(PRODUCT_TYPE_SLUGS[0]);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sizesForType = (sizeOptions ?? []).filter((sizeOption) => sizeOption.type === type);

  const create = useMutation({
    mutationFn: () => sizeOptionsApi.create({ type, label, sortOrder: sizesForType.length }),
    onSuccess: () => {
      setLabel("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-size-options"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const remove = useMutation({
    mutationFn: (sizeOption: SizeOption) => sizeOptionsApi.remove(sizeOption.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-size-options"] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Sizes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The size list a brand picks from when adding a product, per product type.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRODUCT_TYPE_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => setType(slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === slug
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {humanizeType(slug)}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="size-label" className="text-xs text-muted-foreground">
            Size label
          </label>
          <Input
            id="size-label"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="M"
            className="w-32"
          />
        </div>

        <Button type="submit" disabled={create.isPending || !label.trim()}>
          {create.isPending ? "Adding…" : `Add to ${humanizeType(type)}`}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && sizesForType.length === 0 && (
          <p className="text-sm text-muted-foreground">No sizes yet for {humanizeType(type)}.</p>
        )}

        {sizesForType.map((sizeOption) => (
          <div
            key={sizeOption.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Badge tone="neutral" showDot={false}>
                {sizeOption.label}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => remove.mutate(sizeOption)}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
