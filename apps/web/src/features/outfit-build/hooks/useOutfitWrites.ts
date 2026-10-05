"use client";

import { toast } from "@outfiqe/design-system";
import { generateUuid } from "@outfiqe/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { ApiClientError } from "@/shared/lib/apiClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { outfitApi, type OutfitWrite } from "../api/outfitApi";
import type { OutfitBoard, OutfitView, OutfitWriteResult } from "../api/outfitSchemas";
import { MY_BUILDS_QUERY_KEY, outfitQueryKey } from "./outfitQueryKeys";

const VERSION_CONFLICT_CODE = "OUTFIT_VERSION_CONFLICT";
const NO_PENDING_WRITES = 0;
const PENDING_WRITE_STEP = 1;

const LAST_EVENT_INDEX = -1;

export type OptimisticBoardChange = (board: OutfitBoard) => OutfitBoard;

export type SendOutfitWrite = (write: OutfitWrite) => Promise<OutfitWriteResult>;

const findLatestEditorName = async (
  outfitId: string,
  sinceVersion: number,
  board: OutfitBoard,
): Promise<string | null> => {
  try {
    const { events } = await outfitApi.listEvents(outfitId, sinceVersion);
    const latestActorId = events
      .filter((event) => event.actorId !== null)
      .at(LAST_EVENT_INDEX)?.actorId;
    return board.members.find((member) => member.user.id === latestActorId)?.user.name ?? null;
  } catch {
    return null;
  }
};

export const useOutfitWrites = (outfitId: string) => {
  const queryClient = useQueryClient();
  const t = useTranslations("outfitBuild.writes");
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [pendingWriteCount, setPendingWriteCount] = useState(NO_PENDING_WRITES);
  const queryKey = outfitQueryKey(outfitId);

  const describeRefusal = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiClientError && t.has(`refusals.${error.code}`)) {
        return t(`refusals.${error.code}`);
      }
      return getErrorMessage(error);
    },
    [t],
  );

  const sendOnce = useCallback(
    async (
      send: SendOutfitWrite,
      applyChange: OptimisticBoardChange | undefined,
    ): Promise<boolean> => {
      const cachedView = queryClient.getQueryData<OutfitView>(queryKey);
      if (cachedView?.kind !== "board") return false;

      const idempotencyKey = generateUuid();
      if (applyChange)
        queryClient.setQueryData(queryKey, { ...applyChange(cachedView), kind: "board" });

      try {
        const { board } = await send({
          outfitId,
          expectedVersion: cachedView.version,
          idempotencyKey,
        });
        if (board) queryClient.setQueryData(queryKey, { ...board, kind: "board" });
        else await queryClient.invalidateQueries({ queryKey });
        void queryClient.invalidateQueries({ queryKey: MY_BUILDS_QUERY_KEY });
        return true;
      } catch (error) {
        queryClient.setQueryData(queryKey, cachedView);
        if (error instanceof ApiClientError && error.code === VERSION_CONFLICT_CODE) {
          const editorName = await findLatestEditorName(outfitId, cachedView.version, cachedView);
          await queryClient.invalidateQueries({ queryKey });
          toast.error(editorName ? t("conflictBy", { name: editorName }) : t("conflictBySomeone"));
          return false;
        }
        toast.error(describeRefusal(error));
        return false;
      }
    },
    [describeRefusal, outfitId, queryClient, queryKey, t],
  );

  const runWrite = useCallback(
    (send: SendOutfitWrite, applyChange?: OptimisticBoardChange): Promise<boolean> => {
      setPendingWriteCount((count) => count + PENDING_WRITE_STEP);
      const isWriteSaved = writeQueueRef.current.then(() => sendOnce(send, applyChange));
      writeQueueRef.current = isWriteSaved
        .then(() => undefined)
        .finally(() => setPendingWriteCount((count) => count - PENDING_WRITE_STEP));
      return isWriteSaved;
    },
    [sendOnce],
  );

  return { runWrite, isSaving: pendingWriteCount > NO_PENDING_WRITES };
};
