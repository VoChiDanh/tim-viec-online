import type { Job } from "@/features/jobs/types";

export const APPLICATION_LABELS = {
  applied: "Đã ứng tuyển",
  waiting: "Đang xem xét",
  accepted: "Trúng tuyển",
  rejected: "Từ chối",
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_LABELS;
export type CandidateSection =
  "profile" | "jobs" | "messages" | "notifications" | "settings";
export type Application = {
  id: number;
  job_id: number;
  status: ApplicationStatus;
  created_at: string;
  cv_name?: string;
  cover_letter?: string;
};
export type PreviewMessage = {
  id: string;
  conversation_id: number;
  message: string;
  outgoing: boolean;
  created_at: string;
  preview?: boolean;
};
export type Conversation = { id: number; job_id: number; contact: string };
export type CandidateNotification = {
  id: number;
  title: string;
  content: string;
  type: "new_message" | "app_status_changed";
  read_at: string | null;
  created_at: string;
  conversation_id?: number;
  application_id?: number;
};
export type CandidatePreviewData = {
  jobs: Job[];
  today: string;
  applications: Application[];
  savedIds: number[];
  conversations: Conversation[];
  messages: PreviewMessage[];
  notifications: CandidateNotification[];
};
export const CANDIDATE_PAGES: { key: CandidateSection; label: string }[] = [
  { key: "profile", label: "Hồ sơ của tôi" },
  { key: "jobs", label: "Việc làm của tôi" },
  { key: "messages", label: "Tin nhắn" },
  { key: "notifications", label: "Thông báo" },
  { key: "settings", label: "Quản lý tài khoản" },
];

export function candidateHref(section: CandidateSection) {
  return `/account/${section}`;
}
