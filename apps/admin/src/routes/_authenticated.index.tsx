import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthContext";
import { BrandApplicationsPage } from "@/features/brand-applications/BrandApplicationsPage";

const AdminHomePage = () => {
  const { state } = useAuth();
  const hasPlatformAccess = state.status === "signed-in" && state.user.hasPlatformAccess;

  if (!hasPlatformAccess) return <Navigate to="/crm" replace />;
  return <BrandApplicationsPage />;
};

export const Route = createFileRoute("/_authenticated/")({
  component: AdminHomePage,
});
