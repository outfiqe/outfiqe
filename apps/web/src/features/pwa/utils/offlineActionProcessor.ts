import {
  listQueuedOfflineActions,
  type QueuedOfflineAction,
  removeQueuedOfflineAction,
} from "./offlineActionQueue";

export type OfflineActionHandler = (payload: unknown) => Promise<void>;

const handlersByType = new Map<string, OfflineActionHandler>();

export const registerOfflineActionHandler = (type: string, handler: OfflineActionHandler): void => {
  handlersByType.set(type, handler);
};

const runOneQueuedAction = async (action: QueuedOfflineAction): Promise<void> => {
  const handler = handlersByType.get(action.type);
  if (!handler) return;

  await handler(action.payload);
  await removeQueuedOfflineAction(action.key);
};

let isDraining = false;

export const drainQueuedOfflineActions = async (): Promise<void> => {
  if (isDraining) return;
  isDraining = true;

  try {
    const queuedActions = await listQueuedOfflineActions();
    for (const action of queuedActions) {
      await runOneQueuedAction(action).catch(() => undefined);
    }
  } finally {
    isDraining = false;
  }
};
