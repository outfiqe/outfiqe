import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@outfiqe/design-system";

import { SkeletonButton } from "@/components/SkeletonControls";

const TAB = { DETAILS: "details", DESIGN: "design" } as const;

const BADGE_FIELD_SKELETON_COUNT = 4;

export const BadgeFormSkeleton = () => (
  <div role="status" aria-label="Loading">
    <Skeleton className="h-5 w-16" />
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <Skeleton className="h-8 w-64 max-w-full" />
    </div>

    <div aria-hidden>
      <Tabs value={TAB.DETAILS} className="mt-6">
        <TabsList>
          <TabsTrigger value={TAB.DETAILS}>Details</TabsTrigger>
          <TabsTrigger value={TAB.DESIGN} disabled>
            Design
          </TabsTrigger>
        </TabsList>
        <TabsContent value={TAB.DETAILS} className="mt-4 space-y-4">
          {Array.from({ length: BADGE_FIELD_SKELETON_COUNT }, (_unused, fieldIndex) => (
            <div key={fieldIndex} className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>

    <div className="mt-6 space-y-3 border-t border-border pt-4">
      <div className="flex justify-end gap-2">
        <SkeletonButton label="Cancel" />
        <SkeletonButton variant="default" label="Create badge" />
      </div>
    </div>
  </div>
);
