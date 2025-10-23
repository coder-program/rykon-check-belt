"use client";

import React from "react";
import UsuariosManagerNew from "@/components/usuarios/UsuariosManagerNew";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function UsuariosPage() {
  return (
    <ProtectedRoute>
      <UsuariosManagerNew />
    </ProtectedRoute>
  );
}
