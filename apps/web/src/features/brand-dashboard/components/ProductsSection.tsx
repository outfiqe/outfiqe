"use client";

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
import type { BrandProduct } from "../api/brandProductsSchemas";
import { useBrandProducts } from "../hooks/useBrandProducts";
import { useCreateProduct } from "../hooks/useCreateProduct";
import {
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_VALUES,
  TASTE_CATEGORY_LABEL,
  TASTE_CATEGORY_VALUES,
  productFormSchema,
  type ProductFormInput,
} from "../schemas/productForm.schema";

const STATUS_LABEL: Record<BrandProduct["status"], string> = {
  PENDING: "In review",
  APPROVED: "Live",
  REJECTED: "Not approved",
};

const STATUS_CLASS: Record<BrandProduct["status"], string> = {
  PENDING: "bg-muted text-foreground",
  APPROVED: "bg-primary/10 text-primary-strong",
  REJECTED: "bg-destructive/10 text-destructive",
};

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";

export function ProductsSection() {
  const products = useBrandProducts();
  const create = useCreateProduct();

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      type: "tops",
      category: "formal",
      imageUrl: "",
      lowStock: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      form.reset();
    } catch {
      // surfaced via create.error below
    }
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-bold uppercase text-foreground">
          Your products
        </h3>

        {products.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {products.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing listed yet — add your first piece below.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {products.data?.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{product.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rs. {product.price.toLocaleString()}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[product.status]}`}
              >
                {STATUS_LABEL[product.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-6">
        <h3 className="font-display text-base font-bold uppercase text-foreground">
          Add a product
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          New products go live after a quick review.
        </p>

        {create.isError && <FormBanner>{create.error.message}</FormBanner>}

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product name</FormLabel>
                  <FormControl>
                    <Input placeholder="Linen band-collar shirt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Rs.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select className={selectClass} {...field}>
                        {PRODUCT_TYPE_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {PRODUCT_TYPE_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select className={selectClass} {...field}>
                        {TASTE_CATEGORY_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {TASTE_CATEGORY_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lowStock"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormLabel className="mb-0">Mark as low stock</FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
