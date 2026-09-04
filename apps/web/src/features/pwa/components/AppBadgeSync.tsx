"use client";

import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/features/auth";
import { notificationsApi } from "@/shared/lib/notificationsApi";

import { isPwaEnabled } from "../constants/pwaFeatureFlag";
import { showUnreadBadge } from "../utils/appBadge";
import { isRunningStandalone } from "../utils/standalone";

export const AppBadgeSync = () => {
  const { isAuthenticated } = useAuth();
  const shouldTrackBadge = isPwaEnabled && isAuthenticated && isRunningStandalone();

  const { data: unreadCount } = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.unreadCount(),
    enabled: shouldTrackBadge,
  });

  useEffect(() => {
    if (!shouldTrackBadge) return;
    showUnreadBadge(unreadCount ?? 0);
  }, [shouldTrackBadge, unreadCount]);

  useEffect(() => {
    if (isAuthenticated) return;
    showUnreadBadge(0);
  }, [isAuthenticated]);

  return null;
};
