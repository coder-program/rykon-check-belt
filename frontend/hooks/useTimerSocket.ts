"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { TimerState } from "@/lib/timerApi";
import { API_BASE_URL } from "@/lib/api";

interface UseTimerSocketOptions {
  academyId: string;
  role?: "admin" | "viewer";
}

interface UseTimerSocketReturn {
  state: TimerState | null;
  connected: boolean;
  start: (configId: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useTimerSocket({
  academyId,
  role = "viewer",
}: UseTimerSocketOptions): UseTimerSocketReturn {
  const [state, setState] = useState<TimerState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!academyId) return;

    // Connect to the /timer namespace
    const socket = io(`${API_BASE_URL}/timer`, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinTimerRoom", { academyId, role });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("timer:state", (newState: TimerState) => {
      setState(newState);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [academyId, role]);

  const start = useCallback(
    (configId: string) => {
      socketRef.current?.emit("timer:start", { configId, academyId });
    },
    [academyId]
  );

  const pause = useCallback(() => {
    socketRef.current?.emit("timer:pause", { academyId });
  }, [academyId]);

  const resume = useCallback(() => {
    socketRef.current?.emit("timer:resume", { academyId });
  }, [academyId]);

  const reset = useCallback(() => {
    socketRef.current?.emit("timer:reset", { academyId });
  }, [academyId]);

  return { state, connected, start, pause, resume, reset };
}
