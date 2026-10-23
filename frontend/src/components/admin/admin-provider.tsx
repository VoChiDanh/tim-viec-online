"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { AdminDatabase } from "@/features/admin/types";

type AdminState = {
  db: AdminDatabase;
  setDb: Dispatch<SetStateAction<AdminDatabase>>;
  reset: () => void;
};

const AdminContext = createContext<AdminState | null>(null);

/** In-memory workspace for mock mode only; real data belongs in the API adapter. */
export function AdminProvider({
  initial,
  children,
}: {
  initial: AdminDatabase;
  children: ReactNode;
}) {
  const [db, setDb] = useState(initial);
  return (
    <AdminContext.Provider
      value={{ db, setDb, reset: () => setDb(structuredClone(initial)) }}
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
