"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingPageProps {
  message?: string;
}

export default function LoadingPage({
  message = "Carregando...",
}: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <div className="text-white text-xl">{message}</div>
      </div>
    </div>
  );
}
