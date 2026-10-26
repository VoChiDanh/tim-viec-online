"use client";
import { useEffect } from "react";
import { apiRequest } from "@/features/api/client";
import { liveConversations } from "@/features/api/live";

export function BackendRealtime({ userId }: { userId: number }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
    if (!key) return;
    let disposed = false;
    let disconnect = () => {};
    let reconcile = () => {};
    void import("pusher-js")
      .then(({ default: Pusher }) => {
        if (disposed) return;
        const client = new Pusher(key, {
          cluster: "mt1",
          wsHost:
            process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname,
          wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
          wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 443),
          forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
          enabledTransports: ["ws", "wss"],
          channelAuthorization: {
            customHandler: (params, callback) => {
              apiRequest<{ auth: string }>("/broadcasting/auth", {
                method: "POST",
                body: JSON.stringify({
                  socket_id: params.socketId,
                  channel_name: params.channelName,
                }),
              })
                .then((result) => callback(null, result.data))
                .catch(() =>
                  callback(new Error("Không thể xác thực kết nối."), null),
                );
            },
          },
        });
        const refresh = () =>
          window.dispatchEvent(new Event("backend:refresh"));
        const user = client.subscribe(`private-App.Models.User.${userId}`);
        user.bind("notification.sent", refresh);
        const watched = new Set<number>();
        reconcile = () => {
          const wanted = new Set(liveConversations());
          for (const id of watched)
            if (!wanted.has(id)) {
              client.unsubscribe(`private-chat.${id}`);
              watched.delete(id);
            }
          for (const id of wanted)
            if (!watched.has(id)) {
              const channel = client.subscribe(`private-chat.${id}`);
              channel.bind("message.sent", refresh);
              channel.bind("messages.read", refresh);
              watched.add(id);
            }
        };
        reconcile();
        client.connection.bind("connected", refresh);
        disconnect = () => client.disconnect();
      })
      .catch(() => {
        /* Periodic reconciliation continues when WebSocket is unavailable. */
      });
    const update = () => reconcile();
    window.addEventListener("backend:conversations", update);
    return () => {
      disposed = true;
      disconnect();
      window.removeEventListener("backend:conversations", update);
    };
  }, [userId]);
  return null;
}
