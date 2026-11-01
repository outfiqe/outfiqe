"use client";

import { useEffect } from "react";

import { useAuth } from "@/features/auth";

import { ANALYTICS_CONSENT_STATUS } from "../constants/analytics.constants";
import { useAnalyticsConsent } from "../hooks/useAnalyticsConsent";
import { identifyViewer, resetViewer } from "../utils/analyticsClient";

export const AnalyticsIdentity = () => {
  const { state, isAuthenticated, isAuthResolved, isStaff, isRider, isCreator, isBrandOwner } =
    useAuth();
  const { consentStatus } = useAnalyticsConsent();

  const viewerId = isAuthenticated ? (state.user?.id ?? null) : null;
  const viewerRole = state.user?.role.toLowerCase() ?? null;
  const hasGrantedConsent = consentStatus === ANALYTICS_CONSENT_STATUS.GRANTED;

  useEffect(() => {
    if (!isAuthResolved) return;

    if (viewerId && viewerRole && hasGrantedConsent) {
      identifyViewer(viewerId, {
        user_role: viewerRole,
        is_creator: isCreator,
        is_brand_owner: isBrandOwner,
        is_internal: isStaff || isRider,
      });
      return;
    }

    if (!viewerId) resetViewer();
  }, [
    isAuthResolved,
    viewerId,
    viewerRole,
    hasGrantedConsent,
    isCreator,
    isBrandOwner,
    isStaff,
    isRider,
  ]);

  return null;
};
