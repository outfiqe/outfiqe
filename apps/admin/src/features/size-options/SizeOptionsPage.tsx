import { Badge, Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { productTypesApi } from "@/features/product-types/api";

import { sizeOptionsApi } from "./api";
import type { SizeOption } from "./schemas";

export const SizeOptionsPage = () => {
  const queryClient = useQueryClient();
  const { data: productTypes } = useQuery({
    queryKey: ["admin-product-types"],
    queryFn: productTypesApi.list,
  });
  const { data: sizeOptions, isLoading } = useQuery({
    queryKey: ["admin-size-options"],
    queryFn: sizeOptionsApi.list,
  });

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const type = selectedType ?? productTypes?.[0]?.slug ?? null;
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const labelForType = (slug: string) =>
    productTypes?.find((productType) => productType.slug === slug)?.label ?? slug;

  const sizesForType = (sizeOptions ?? []).filter((sizeOption) => sizeOption.type === type);

  const create = useMutation({
    mutationFn: () =>
      sizeOptionsApi.create({ type: type ?? "", label, sortOrder: sizesForType.length }),
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
    if (type) create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Sizes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The size list a brand picks from when adding a product, per garment type.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(productTypes ?? []).map((productType) => (
          <button
            key={productType.slug}
            onClick={() => setSelectedType(productType.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === productType.slug
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {productType.label}
            {!productType.isActive && " (off)"}
          </button>
        ))}
      </div>

      {type && (
        <>
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
              {create.isPending ? "Adding…" : `Add to ${labelForType(type)}`}
            </Button>
          </form>

          {error && <FormBanner className="mt-3">{error}</FormBanner>}

          <div className="mt-6 space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && sizesForType.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sizes yet for {labelForType(type)}.
              </p>
            )}

            {sizesForType.map((sizeOption) => (
              <div
                key={sizeOption.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Badge tone="neutral" showDot={false}>
                  {sizeOption.label}
                </Badge>

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
        </>
      )}

      {!type && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add a garment type first, then come back to give it sizes.
        </p>
      )}
    </div>
  );
};
