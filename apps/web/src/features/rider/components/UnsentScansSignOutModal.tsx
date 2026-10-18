"use client";

import { Button, Modal } from "@outfiqe/design-system";

import type { useSignOutWithScanCheck } from "../hooks/useSignOutWithScanCheck";
import { describeScanCount } from "../utils/riderTask.utils";

type UnsentScansSignOutModalProps = {
  signOutCheck: ReturnType<typeof useSignOutWithScanCheck>;
};

export const UnsentScansSignOutModal = ({ signOutCheck }: UnsentScansSignOutModalProps) => {
  const { isWarningOpen, closeWarning, signOut, isSigningOut, unsentScanCount } = signOutCheck;

  return (
    <Modal
      open={isWarningOpen}
      onClose={closeWarning}
      title="Scans not sent yet"
      description={`${describeScanCount(unsentScanCount)} still waiting on this phone.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeWarning}>
            Stay signed in
          </Button>
          <Button onClick={signOut} disabled={isSigningOut}>
            Sign out anyway
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        Get online and wait for them to send. If you sign out, they stay on this phone and send the
        next time you sign in here.
      </p>
    </Modal>
  );
};
