"use client";
import { useEffect, useRef } from "react";

let conversationIds: number[] = [];
export const liveConversations = () => conversationIds;
export function watchConversations(ids: number[]) {
  conversationIds = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))];
  window.dispatchEvent(new Event("backend:conversations"));
}

/** WebSocket events update immediately; polling also reconciles missed events. */
export function useLiveRefresh(refresh: () => void | Promise<void>, enabled = true, ids?: number[]) {
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  const key = ids?.join(",");
  useEffect(() => {
    if (enabled && key !== undefined) watchConversations(key ? key.split(",").map(Number) : []);
  }, [enabled, key]);
  useEffect(() => {
    if (!enabled) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    const run = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try { await callback.current(); } catch { /* Retain current data; mutations surface actionable errors. */ }
      finally { busy = false; }
    };
    const schedule = () => {
      clearTimeout(pending);
      pending = setTimeout(() => void run(), 100);
    };
    const interval = setInterval(() => void run(), 30_000);
    window.addEventListener("backend:refresh", schedule);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(pending); clearInterval(interval);
      window.removeEventListener("backend:refresh", schedule);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [enabled]);
}
