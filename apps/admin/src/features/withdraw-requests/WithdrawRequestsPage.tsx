import { WithdrawRequestsListSection } from "./WithdrawRequestsListSection";

export const WithdrawRequestsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Withdrawal requests</h1>
      <WithdrawRequestsListSection />
    </div>
  );
};
