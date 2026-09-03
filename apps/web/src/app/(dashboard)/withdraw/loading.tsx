import { WithdrawSectionSkeleton } from "@/features/withdraw";

const WithdrawLoading = () => (
  <div role="status" aria-label="Loading">
    <WithdrawSectionSkeleton />
  </div>
);

export default WithdrawLoading;
