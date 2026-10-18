"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { useState } from "react";

import { useLogout } from "@/features/auth";

import { usePendingScans } from "../context/PendingScansContext";
import { describeScanCount } from "../utils/riderTask.utils";

const NO_UNSENT_SCANS = 0;

export const RiderLogoutButton = () => {
  const { pendingScans } = usePendingScans();
  const logout = useLogout();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const unsentScanCount = pendingScans.length;

  const requestSignOut = () => {
    if (unsentScanCount > NO_UNSENT_SCANS) {
      setIsWarningOpen(true);
      return;
    }
    logout.mutate();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={requestSignOut} disabled={logout.isPending}>
        Sign out
      </Button>
      <Modal
        open={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        title="Scans not sent yet"
        description={`${describeScanCount(unsentScanCount)} still waiting on this phone.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsWarningOpen(false)}>
              Stay signed in
            </Button>
            <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
              Sign out anyway
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Get online and wait for them to send. If you sign out, they stay on this phone and send
          the next time you sign in here.
        </p>
      </Modal>
    </>
  );
};
