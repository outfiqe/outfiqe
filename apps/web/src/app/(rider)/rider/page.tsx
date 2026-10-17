import type { Metadata } from "next";

import { RiderTasksPage } from "@/features/rider";

export const metadata: Metadata = { title: "Today's visits" };

const RiderHomePage = () => <RiderTasksPage />;

export default RiderHomePage;
