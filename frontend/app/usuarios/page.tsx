"use client";

import React from "react";
import UsuariosManagerModern from "@/components/usuarios/UsuariosManagerModern";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function UsuariosPage() {
  return (
    <ProtectedRoute>
      <UsuariosManagerModern />
    </ProtectedRoute>
  );
}
