import { Button } from "@outfiqe/design-system";

import type { ImpersonationSession } from "../api/platformImpersonationSchemas";
import { formatMoment } from "../utils/impersonation.utils";

export const SessionTable = ({
  sessions,
  onRevoke,
  revokingId,
  onOpen,
  openingId,
  canRevoke,
}: {
  sessions: ImpersonationSession[];
  canRevoke?: (session: ImpersonationSession) => boolean;
  onRevoke?: (sessionId: string) => void;
  revokingId?: string;
  onOpen?: (sessionId: string) => void;
  openingId?: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase text-muted-foreground">
        <tr>
          <th className="py-2 pr-4">Tenant</th>
          <th className="py-2 pr-4">Acting as</th>
          <th className="py-2 pr-4">Staff</th>
          <th className="py-2 pr-4">Scope</th>
          <th className="py-2 pr-4">Started</th>
          <th className="py-2 pr-4">Expires</th>
          <th className="py-2 pr-4">State</th>
          {onRevoke && <th className="py-2">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => (
          <tr key={session.id} className="border-t border-border">
            <td className="py-2 pr-4">{session.organizationName ?? session.organizationId}</td>
            <td className="py-2 pr-4">{session.targetUserName ?? session.targetUserId}</td>
            <td className="py-2 pr-4">{session.impersonatorName ?? session.impersonatorId}</td>
            <td className="py-2 pr-4">{session.scope}</td>
            <td className="py-2 pr-4">{formatMoment(session.createdAt)}</td>
            <td className="py-2 pr-4">{formatMoment(session.expiresAt)}</td>
            <td className="py-2 pr-4">
              {session.active ? "Active" : session.revokedById ? "Revoked" : "Expired"}
            </td>
            {onRevoke && (
              <td className="py-2">
                {session.active && (
                  <div className="flex gap-2">
                    {onOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={openingId === session.id}
                        onClick={() => onOpen(session.id)}
                      >
                        Open
                      </Button>
                    )}
                    {canRevoke?.(session) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revokingId === session.id}
                        onClick={() => onRevoke(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
