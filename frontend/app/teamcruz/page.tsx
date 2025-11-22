"use client";

import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";

const DashboardNew = dynamic(
  () => import("@/components/teamcruz/DashboardNew"),
  { ssr: false }
);

export default function TeamCruzPage() {
  const { shouldBlock } = useFranqueadoProtection();

  if (shouldBlock) return null;

  return (
    <ProtectedRoute>
      <DashboardNew />
    </ProtectedRoute>
  );
}
