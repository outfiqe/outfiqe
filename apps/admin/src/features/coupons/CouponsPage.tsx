import { Tabs, TabsContent, TabsList, TabsTrigger } from "@outfiqe/design-system";

import { CouponsListSection } from "./CouponsListSection";
import { RedemptionLookupSection } from "./RedemptionLookupSection";

export const CouponsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Coupons</h1>

      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="lookup">Redemption lookup</TabsTrigger>
        </TabsList>
        <TabsContent value="coupons" className="mt-6">
          <CouponsListSection />
        </TabsContent>
        <TabsContent value="lookup" className="mt-6">
          <RedemptionLookupSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
