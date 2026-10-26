import { authApiEnabled } from "@/services/auth-mode";
import { getCurrentUser } from "@/services/auth-session";
import { BackendRealtime } from "./backend-realtime";

export async function BackendRealtimeSession() {
  if (!authApiEnabled()) return null;
  const user = await getCurrentUser();
  return user ? <BackendRealtime key={user.id} userId={user.id} /> : null;
}
