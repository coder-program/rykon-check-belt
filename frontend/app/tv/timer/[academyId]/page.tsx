"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { useTimerSocket } from "@/hooks/useTimerSocket";

/**
 * Rota pública: /tv/timer/[academyId]
 * Exibe o painel de cronômetro em modo fullscreen para TVs e dispositivos.
 * Não requer autenticação.
 */
export default function TvTimerPage() {
  const params = useParams();
  const academyId = params?.academyId as string;

  const { state, connected } = useTimerSocket({ academyId, role: "viewer" });

  // Solicitar fullscreen automaticamente ao abrir
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Silently ignore — browser pode bloquear sem interação
      });
    }
  }, []);

  // Prevenir sleep no dispositivo (Wake Lock API)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // Wake Lock não disponível — silenciar
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

  return (
    <TimerDisplay
      state={state}
      connected={connected}
      tvMode={true}
    />
  );
}
