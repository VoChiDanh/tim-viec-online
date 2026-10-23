"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CandidatePreviewData,
  PreviewMessage,
  Application,
} from "@/features/candidate-workspace/types";
import {
  applicationError,
  type ApplyInput,
  type ApplyResult,
} from "@/features/candidate-workspace/application";
import { validateCv } from "@/features/candidate-profile/validation";
import { validateMessage } from "@/features/candidate-workspace/rules";
import { createProfilePreview } from "@/mocks/candidate-profile";
import type { CandidateProfile } from "@/features/candidate-profile/types";

type WorkspaceInitial = CandidatePreviewData & { profile?: CandidateProfile };

function useWorkspaceState(initial: WorkspaceInitial) {
  const [profile, setProfile] = useState(
    () => initial.profile ?? createProfilePreview(),
  );
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [savedIds, setSavedIds] = useState(initial.savedIds);
  const [applications, setApplications] = useState(initial.applications);
  const applicationRecords = useRef(initial.applications);
  const [applicationFiles, setApplicationFiles] = useState<
    Record<number, File>
  >({});
  const [messages, setMessages] = useState(initial.messages);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [notifications, setNotifications] = useState(initial.notifications);
  const [emailPrefs, setEmailPrefs] = useState({
    applications: true,
    messages: true,
  });
  return {
    ...initial,
    profile,
    setProfile,
    avatar,
    setAvatar,
    cv,
    setCv,
    savedIds,
    applications,
    applicationFiles,
    messages,
    drafts,
    notifications,
    emailPrefs,
    setEmailPrefs,
    toggleSaved: (id: number) => {
      if (!initial.jobs.some((job) => job.id === id)) return;
      setSavedIds((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [id, ...current],
      );
    },
    submitApplication: async (input: ApplyInput): Promise<ApplyResult> => {
      const job = initial.jobs.find((item) => item.id === input.jobId);
      const error = applicationError(
        job,
        applicationRecords.current,
        input.coverLetter,
      );
      if (error) return { success: false, message: error };
      try {
        const invalid = await validateCv(input.cv);
        if (invalid) return { success: false, message: invalid };
      } catch {
        return {
          success: false,
          message: "Không đọc được tệp CV. Vui lòng chọn lại.",
        };
      }
      // Recheck after reading the PDF: competing clicks must never add duplicates.
      const changed = applicationError(
        job,
        applicationRecords.current,
        input.coverLetter,
      );
      if (changed) return { success: false, message: changed };
      const application: Application = {
        id:
          Math.max(0, ...applicationRecords.current.map((item) => item.id)) + 1,
        job_id: input.jobId,
        status: "applied",
        created_at: new Date().toISOString(),
        cv_name: input.cv.name,
        cover_letter: input.coverLetter.trim(),
      };
      applicationRecords.current = [application, ...applicationRecords.current];
      setApplications(applicationRecords.current);
      // Snapshot the submitted File; replacing the default CV cannot alter an application.
      setApplicationFiles((current) => ({
        ...current,
        [application.id]: input.cv,
      }));
      return { success: true, application };
    },
    removeSaved: (id: number) =>
      setSavedIds((current) => current.filter((value) => value !== id)),
    setDraft: (id: number, value: string) =>
      setDrafts((current) => ({ ...current, [id]: value })),
    sendPreview: (id: number) => {
      const text = drafts[id] ?? "";
      const error = validateMessage(text);
      if (error || !initial.conversations.some((item) => item.id === id))
        return error ?? "Không tìm thấy hội thoại.";
      const message: PreviewMessage = {
        id: crypto.randomUUID(),
        conversation_id: id,
        message: text.trim(),
        outgoing: true,
        preview: true,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, message]);
      setDrafts((current) => ({ ...current, [id]: "" }));
      return null;
    },
    markRead: (id?: number) =>
      setNotifications((current) =>
        current.map((item) =>
          !item.read_at && (id === undefined || item.id === id)
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      ),
  };
}
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceState
> | null>(null);
export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: WorkspaceInitial;
  children: ReactNode;
}) {
  const value = useWorkspaceState(initial);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Candidate preview requires WorkspaceProvider");
  return value;
}
export function useOptionalWorkspace() {
  return useContext(WorkspaceContext);
}
