"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AdminDatabase } from "@/features/admin/types";
import type {
  AdminCommand,
  AdminFailure,
  AdminWorkspaceAdapter,
} from "@/features/admin/adapter";
import { createAdminMockAdapter } from "@/mocks/admin-adapter";

type AdminState = {
  db: AdminDatabase;
  pending: boolean;
  execute: (command: AdminCommand) => Promise<{ success: true } | AdminFailure>;
  reset: () => void;
};
const AdminContext = createContext<AdminState | null>(null);

// The server only mounts this workspace with mock data today. A future API
// adapter can replace the factory here; components already await all writes.
export function AdminProvider({
  initial,
  children,
  adapter: suppliedAdapter,
}: {
  initial: AdminDatabase;
  children: ReactNode;
  adapter?: AdminWorkspaceAdapter;
}) {
  const [adapter] = useState(
    () => suppliedAdapter ?? createAdminMockAdapter(initial),
  );
  const [db, setDb] = useState(initial);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const execute: AdminState["execute"] = async (command) => {
    if (busy.current)
      return {
        success: false,
        code: "busy",
        message: "Đang xử lý. Vui lòng đợi.",
      };
    busy.current = true;
    setPending(true);
    try {
      const result = await adapter.execute(command);
      if (!result.success) return result;
      setDb(result.data);
      return { success: true };
    } catch {
      return {
        success: false,
        code: "unavailable",
        message: "Không thể hoàn tất thao tác. Vui lòng thử lại.",
      };
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <AdminContext.Provider
      value={{
        db,
        pending,
        execute,
        reset: () => {
          if (!busy.current) setDb(adapter.reset());
        },
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
export function useAdminData() {
  const state = useContext(AdminContext);
  if (!state)
    throw new Error("AdminProvider is required for the admin workspace");
  return state;
}
