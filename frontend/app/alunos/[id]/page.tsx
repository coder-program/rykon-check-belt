"use client";

import React from "react";
import { useParams } from "next/navigation";
import AlunoDashboard from "@/components/dashboard/AlunoDashboard";

export default function AlunoDetalhesPage() {
  const params = useParams();
  const alunoId = params.id as string;

  return <AlunoDashboard alunoId={alunoId} showBackButton={true} />;
}
