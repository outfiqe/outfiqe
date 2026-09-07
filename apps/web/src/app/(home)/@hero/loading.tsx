import { Skeleton } from "@outfiqe/design-system";

const HeroLoading = () => (
  <section role="status" aria-label="Loading highlights" className="pb-4 sm:px-6 lg:px-10">
    <Skeleton className="h-48 rounded-none sm:h-105 sm:rounded-3xl" />
  </section>
);

export default HeroLoading;
