"use client";
import { useEffect } from "react";
import { wakeupServer } from "@/lib/wakeup";

/** Componente invisível — dispara o wakeup do backend assim que a app monta. */
export function ServerWakeup() {
  useEffect(() => { wakeupServer(); }, []);
  return null;
}
