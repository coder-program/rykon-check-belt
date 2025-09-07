"use client";

import dynamic from "next/dynamic";
const DashboardNew = dynamic(
  () => import("@/components/teamcruz/DashboardNew"),
  { ssr: false },
);

export default function TeamCruzPage() {
  return <DashboardNew />;
}
