import { ShopExploreToggle } from "./ShopExploreToggle";

export function MobileTabBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-border bg-background/95 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <ShopExploreToggle size="lg" />
    </div>
  );
}
