"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/components/ui/form";
import { FormBanner } from "@/components/FormBanner";
import { useCreateLook } from "../hooks/useCreateLook";
import { useMyLooks } from "../hooks/useMyLooks";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { lookFormSchema, type LookFormInput } from "../schemas/lookForm.schema";

export function LooksSection() {
  const looks = useMyLooks();
  const taggableProducts = useTaggableProducts();
  const create = useCreateLook();
  const [productFilter, setProductFilter] = useState("");

  const form = useForm<LookFormInput>({
    resolver: zodResolver(lookFormSchema),
    defaultValues: { imageUrl: "", caption: "", taggedProducts: [] },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      form.reset();
    } catch {
      // surfaced via create.error below
    }
  });

  const filteredProducts = (taggableProducts.data?.products ?? []).filter((product) =>
    product.name.toLowerCase().includes(productFilter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-bold uppercase text-foreground">Your looks</h3>

        {looks.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {looks.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing posted yet — share your first fit below.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {looks.data?.map((look) => (
            <div
              key={look.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <div
                className="size-14 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${look.imageUrl})` }}
              />
              <div>
                {look.caption && <p className="text-sm text-foreground">{look.caption}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {look.taggedProducts.map((product) => product.name).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-6">
        <h3 className="font-display text-base font-bold uppercase text-foreground">Post a look</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Share a fit and tag the pieces you&apos;re wearing.
        </p>

        {create.isError && <FormBanner>{create.error.message}</FormBanner>}

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Layering for Kathmandu winters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taggedProducts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag products (1–6) — size worn is required for each</FormLabel>
                  <Input
                    placeholder="Filter products…"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="mb-2"
                  />
                  <FormControl>
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                      {taggableProducts.isLoading && (
                        <p className="p-2 text-sm text-muted-foreground">Loading products…</p>
                      )}
                      {filteredProducts.map((product) => {
                        const tag = field.value.find((t) => t.productId === product.id);
                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <label className="flex flex-1 items-center gap-2">
                              <input
                                type="checkbox"
                                className="size-4 rounded border-border"
                                checked={tag !== undefined}
                                onChange={(e) => {
                                  field.onChange(
                                    e.target.checked
                                      ? [...field.value, { productId: product.id, sizeWorn: "" }]
                                      : field.value.filter((t) => t.productId !== product.id),
                                  );
                                }}
                              />
                              <span className="text-foreground">{product.name}</span>
                              <span className="text-muted-foreground">— {product.brand}</span>
                            </label>
                            {tag && (
                              <Input
                                placeholder="Size worn (e.g. M)"
                                className="w-32"
                                value={tag.sizeWorn}
                                onChange={(e) =>
                                  field.onChange(
                                    field.value.map((t) =>
                                      t.productId === product.id
                                        ? { ...t, sizeWorn: e.target.value }
                                        : t,
                                    ),
                                  )
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Posting…" : "Post look"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
