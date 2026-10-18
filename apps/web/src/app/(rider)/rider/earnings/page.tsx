import type { Metadata } from "next";

import { RiderEarningsPage } from "@/features/rider";

export const metadata: Metadata = { title: "Your earnings" };

const RiderEarningsRoute = () => <RiderEarningsPage />;

export default RiderEarningsRoute;
