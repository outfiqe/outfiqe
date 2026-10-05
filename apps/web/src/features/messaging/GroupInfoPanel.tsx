"use client";

import { Badge, Button, FormBanner, Input, Label, Modal, Skeleton } from "@outfiqe/design-system";
import { useGroupActions, useGroupMembers } from "@outfiqe/hooks";
import type { ChatContact, ConversationMember, ConversationMemberRole } from "@outfiqe/types";
import { type FormEvent, useId, useState } from "react";

import { useAuth } from "@/features/auth";
import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { conversationsApi } from "@/shared/lib/conversationsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { ContactPicker } from "./ContactPicker";
import {
  GROUP_MEMBER_ROLE,
  GROUP_NAME_MAX_LENGTH,
  MAX_PEOPLE_PER_GROUP_CHANGE,
} from "./messaging.constants";

const MEMBER_SKELETON_COUNT = 3;

type GroupInfoPanelProps = {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  myRole: ConversationMemberRole;
  onLeft: () => void;
};

const MemberFace = ({ member }: { member: ChatContact }) => (
  <span
    aria-hidden
    className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
    style={member.avatarUrl ? undefined : { backgroundColor: getAvatarColor(member.id) }}
  >
    {member.avatarUrl ? (
      <AppImage src={member.avatarUrl} alt="" fill sizes="36px" />
    ) : (
      initialsFor(member.name)
    )}
  </span>
);

export const GroupInfoPanel = ({
  open,
  onClose,
  conversationId,
  groupName,
  myRole,
  onLeft,
}: GroupInfoPanelProps) => {
  const { state } = useAuth();
  const currentUserId = state.user?.id;
  const nameInputId = useId();
  const membersQuery = useGroupMembers(conversationsApi, conversationId, open);
  const { rename, addMembers, changeRole, removeMember, leave } = useGroupActions(
    conversationsApi,
    conversationId,
  );
  const [draftName, setDraftName] = useState(groupName);
  const [peopleToAdd, setPeopleToAdd] = useState<ChatContact[]>([]);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  const isAdmin = myRole === GROUP_MEMBER_ROLE.ADMIN;
  const members = membersQuery.data?.members ?? [];
  const failedAction = [rename, addMembers, changeRole, removeMember, leave].find(
    (action) => action.isError,
  );
  const trimmedDraftName = draftName.trim();
  const canSaveName = trimmedDraftName.length > 0 && trimmedDraftName !== groupName;

  const saveGroupName = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSaveName) rename.mutate(trimmedDraftName);
  };

  const addSelectedPeople = (): void => {
    addMembers.mutate(
      peopleToAdd.map(({ id }) => id),
      { onSuccess: () => setPeopleToAdd([]) },
    );
  };

  const leaveGroup = (): void => {
    leave.mutate(undefined, { onSuccess: onLeft });
  };

  const renderMemberActions = (member: ConversationMember) => {
    const isSelf = member.id === currentUserId;
    const isMemberAdmin = member.role === GROUP_MEMBER_ROLE.ADMIN;
    if (!isAdmin) return null;

    if (isSelf) {
      return isMemberAdmin ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => changeRole.mutate({ userId: member.id, role: GROUP_MEMBER_ROLE.MEMBER })}
          isLoading={changeRole.isPending && changeRole.variables?.userId === member.id}
        >
          Step down as admin
        </Button>
      ) : null;
    }

    return (
      <span className="flex shrink-0 gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            changeRole.mutate({
              userId: member.id,
              role: isMemberAdmin ? GROUP_MEMBER_ROLE.MEMBER : GROUP_MEMBER_ROLE.ADMIN,
            })
          }
          isLoading={changeRole.isPending && changeRole.variables?.userId === member.id}
        >
          {isMemberAdmin ? "Remove as admin" : "Make admin"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          aria-label={`Remove ${member.name} from the group`}
          onClick={() => removeMember.mutate(member.id)}
          isLoading={removeMember.isPending && removeMember.variables === member.id}
        >
          Remove
        </Button>
      </span>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Group info" description={groupName}>
      <div className="space-y-6">
        {failedAction && (
          <FormBanner tone="negative">{getErrorMessage(failedAction.error)}</FormBanner>
        )}

        {isAdmin && (
          <form onSubmit={saveGroupName} className="space-y-1.5">
            <Label htmlFor={nameInputId}>Group name</Label>
            <div className="flex gap-2">
              <Input
                id={nameInputId}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={GROUP_NAME_MAX_LENGTH}
                required
              />
              <Button type="submit" disabled={!canSaveName} isLoading={rename.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}

        <section aria-labelledby={`${nameInputId}-members`} className="space-y-2">
          <h3 id={`${nameInputId}-members`} className="text-sm font-semibold text-foreground">
            {members.length > 0 ? `${members.length} people` : "People"}
          </h3>

          {membersQuery.isLoading && (
            <div role="status" aria-label="Loading members" className="space-y-2">
              {Array.from({ length: MEMBER_SKELETON_COUNT }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          )}

          {membersQuery.isError && (
            <div role="alert" className="flex items-center justify-between gap-2 text-sm">
              <span className="text-destructive">Couldn&apos;t load the members.</span>
              <Button size="sm" variant="outline" onClick={() => void membersQuery.refetch()}>
                Retry
              </Button>
            </div>
          )}

          <ul className="space-y-1">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <MemberFace member={member} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {member.id === currentUserId ? `${member.name} (you)` : member.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{member.handle}
                  </span>
                </span>
                {member.role === GROUP_MEMBER_ROLE.ADMIN && (
                  <Badge tone="positive" showDot={false}>
                    Admin
                  </Badge>
                )}
                {renderMemberActions(member)}
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Add people</h3>
            <ContactPicker
              selectedContacts={peopleToAdd}
              onChange={setPeopleToAdd}
              excludedUserIds={members.map(({ id }) => id)}
              maxSelectable={MAX_PEOPLE_PER_GROUP_CHANGE}
            />
            <Button
              onClick={addSelectedPeople}
              disabled={peopleToAdd.length === 0}
              isLoading={addMembers.isPending}
            >
              Add to group
            </Button>
          </section>
        )}

        <section className="border-t border-border pt-4">
          {isConfirmingLeave ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Leave {groupName}? You won&apos;t see new messages unless someone adds you back.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-destructive text-destructive"
                  onClick={leaveGroup}
                  isLoading={leave.isPending}
                >
                  Yes, leave
                </Button>
                <Button variant="ghost" onClick={() => setIsConfirmingLeave(false)}>
                  Stay
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-destructive text-destructive"
              onClick={() => setIsConfirmingLeave(true)}
            >
              Leave group
            </Button>
          )}
        </section>
      </div>
    </Modal>
  );
};
