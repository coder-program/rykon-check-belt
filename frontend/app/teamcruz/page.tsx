"use client";

import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const DashboardNew = dynamic(
  () => import("@/components/teamcruz/DashboardNew"),
  { ssr: false }
);

export default function TeamCruzPage() {
  return (
    <ProtectedRoute>
      <DashboardNew />
    </ProtectedRoute>
  );
}
