import { ShopExploreToggle } from "./ShopExploreToggle";

export function MobileTabBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <ShopExploreToggle size="lg" />
    </div>
  );
}
