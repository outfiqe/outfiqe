import { get, set } from "idb-keyval";

import {
  MAX_QUEUED_OFFLINE_ACTIONS,
  OFFLINE_ACTION_QUEUE_STORAGE_KEY,
} from "../constants/offlineActions";
import { runWithoutFailingWhenStorageIsUnavailable } from "./browserDatabase";

export type QueuedOfflineAction = {
  key: string;
  type: string;
  payload: unknown;
  queuedAt: number;
};

const FIRST_INDEX = 0;

const readQueue = async (): Promise<QueuedOfflineAction[]> =>
  (await runWithoutFailingWhenStorageIsUnavailable(() =>
    get<QueuedOfflineAction[]>(OFFLINE_ACTION_QUEUE_STORAGE_KEY),
  )) ?? [];

const writeQueue = (queue: QueuedOfflineAction[]): Promise<void | undefined> =>
  runWithoutFailingWhenStorageIsUnavailable(() => set(OFFLINE_ACTION_QUEUE_STORAGE_KEY, queue));

export const enqueueOfflineAction = async (
  type: string,
  key: string,
  payload: unknown,
): Promise<void> => {
  const queueWithoutThisKey = (await readQueue()).filter((action) => action.key !== key);
  const queueWithNewAction = [...queueWithoutThisKey, { key, type, payload, queuedAt: Date.now() }];

  const overflow = queueWithNewAction.length - MAX_QUEUED_OFFLINE_ACTIONS;
  const queueWithinCap =
    overflow > FIRST_INDEX ? queueWithNewAction.slice(overflow) : queueWithNewAction;

  await writeQueue(queueWithinCap);
};

export const listQueuedOfflineActions = (): Promise<QueuedOfflineAction[]> => readQueue();

export const removeQueuedOfflineAction = async (key: string): Promise<void> => {
  const remainingQueue = (await readQueue()).filter((action) => action.key !== key);
  await writeQueue(remainingQueue);
};
