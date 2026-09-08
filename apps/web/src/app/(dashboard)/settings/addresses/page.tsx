import type { Metadata } from "next";

import { AddressList } from "@/features/addresses";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Addresses" };

const DashboardAddressesPage = async () => {
  await requireAuthedSession("/settings/addresses");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-foreground">Addresses</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Manage the delivery addresses you can pick from at checkout.
      </p>

      <div className="mt-6">
        <AddressList />
      </div>
    </div>
  );
};

export default DashboardAddressesPage;
