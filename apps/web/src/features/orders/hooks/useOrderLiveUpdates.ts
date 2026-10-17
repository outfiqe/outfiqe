"use client";

import { type Notification, NotificationType } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { acquireSocketConnection, releaseSocketConnection } from "@/shared/lib/socketClient";

import { orderQueryKey } from "../constants/trackingQueryKeys";

const NOTIFICATION_CREATED_EVENT = "notification:created";
const NOTIFICATION_UPDATED_EVENT = "notification:updated";

const isUpdateForOrder = (notification: Notification, orderId: string) =>
  notification.type === NotificationType.ORDER_STATUS_CHANGED && notification.entityId === orderId;

export const useOrderLiveUpdates = (orderId: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = acquireSocketConnection();

    const refreshOrderOnUpdate = (notification: Notification) => {
      if (!isUpdateForOrder(notification, orderId)) return;
      void queryClient.invalidateQueries({ queryKey: orderQueryKey(orderId) });
    };

    socket.on(NOTIFICATION_CREATED_EVENT, refreshOrderOnUpdate);
    socket.on(NOTIFICATION_UPDATED_EVENT, refreshOrderOnUpdate);
    return () => {
      socket.off(NOTIFICATION_CREATED_EVENT, refreshOrderOnUpdate);
      socket.off(NOTIFICATION_UPDATED_EVENT, refreshOrderOnUpdate);
      releaseSocketConnection();
    };
  }, [orderId, queryClient]);
};
