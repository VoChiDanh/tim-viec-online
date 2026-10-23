import { getCurrentUser } from "@/services/auth-session";
import { HeaderControls } from "@/components/layout/header-controls";

export function GuestNavigation() {
  return <HeaderControls pendingSession />;
}
export async function SessionNavigation() {
  let user;
  let sessionUnavailable = false;
  try {
    user = await getCurrentUser();
  } catch {
    sessionUnavailable = true;
  }
  return (
    <HeaderControls
      user={user ?? undefined}
      sessionUnavailable={sessionUnavailable}
    />
  );
}
