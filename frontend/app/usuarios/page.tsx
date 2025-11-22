"use client";

import React from "react";
import UsuariosManagerModern from "@/components/usuarios/UsuariosManagerModern";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";

export default function UsuariosPage() {
  const { shouldBlock } = useFranqueadoProtection();

  if (shouldBlock) return null;

  return (
    <ProtectedRoute>
      <UsuariosManagerModern />
    </ProtectedRoute>
  );
}
