import type { BrandCategory, BrandProfile } from "../api/brandDashboardSchemas";
import { ProductsSection } from "./ProductsSection";

const CATEGORY_LABEL: Record<BrandCategory, string> = {
  STREETWEAR: "Streetwear",
  TRADITIONAL: "Traditional",
  THRIFT: "Thrift",
  KIDS: "Kids",
  FORMAL: "Formal",
};

export function BrandDashboard({ profile }: { profile: BrandProfile }) {
  const { brand } = profile;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-primary-strong">
              {CATEGORY_LABEL[brand.category]}
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{brand.name}</h2>
          </div>
          {brand.madeInNepal && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Made in Nepal
            </span>
          )}
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="mt-0.5 text-foreground">{brand.contactName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 text-foreground">{brand.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="mt-0.5 text-foreground">{brand.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Instagram</dt>
            <dd className="mt-0.5 text-foreground">{brand.instagram}</dd>
          </div>
        </dl>
      </div>

      <ProductsSection />
    </div>
  );
}
