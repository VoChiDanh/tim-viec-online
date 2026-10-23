"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  ApplicationStatus,
  CompanyValues,
  EmployerData,
  JobValues,
} from "@/features/employer/types";
import {
  companyReady,
  effectiveJobStatus,
  jobFromValues,
  validateCompany,
  validateJob,
} from "@/features/employer/rules";
import { vietnamToday } from "@/features/jobs/formatters";

function useEmployerState(initial: EmployerData) {
  const [company, setCompany] = useState(initial.company);
  const [logo, setLogo] = useState<File | null>(null);
  const [jobs, setJobs] = useState(initial.jobs);
  const [applications, setApplications] = useState(initial.applications);
  const [conversations, setConversations] = useState(initial.conversations);
  const [messages, setMessages] = useState(initial.messages);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  return {
    ...initial,
    company,
    logo,
    setLogo,
    jobs,
    applications,
    conversations,
    messages,
    notifications,
    drafts,
    saveCompany: (values: CompanyValues) => {
      const errors = validateCompany(values);
      if (!Object.keys(errors).length)
        setCompany((current) => ({ ...current, ...values }));
      return errors;
    },
    saveJob: (
      values: JobValues,
      id?: number,
    ): { id?: number; errors: Record<string, string> } => {
      const today = vietnamToday(new Date());
      const errors = validateJob(values, today);
      if (!companyReady(company))
        errors.company = "Hoàn thiện hồ sơ công ty trước khi đăng tin.";
      if (
        !initial.categories.some(
          (category) => category.id === values.category_id,
        )
      )
        errors.category_id = "Ngành nghề không hợp lệ.";
      if (
        !values.skill_ids.every((skill) =>
          initial.skills.some((item) => item.id === skill),
        )
      )
        errors.skill_ids = "Kỹ năng không hợp lệ.";
      const previous =
        id === undefined
          ? undefined
          : jobs.find((job) => job.id === id && job.company_id === company.id);
      if (id !== undefined && !previous)
        errors.job = "Không tìm thấy tin tuyển dụng.";
      if (Object.keys(errors).length) return { errors };
      const nextId = id ?? Math.max(0, ...jobs.map((job) => job.id)) + 1;
      const job = jobFromValues(
        values,
        company,
        nextId,
        initial.skills,
        previous,
      );
      setJobs((current) =>
        previous
          ? current.map((item) => (item.id === id ? job : item))
          : [job, ...current],
      );
      return { id: nextId, errors: {} };
    },
    changeJobStatus: (id: number, status: "active" | "closed") => {
      const job = jobs.find(
        (item) => item.id === id && item.company_id === company.id,
      );
      if (!job) return "Không tìm thấy tin tuyển dụng.";
      if (
        status === "active" &&
        (job.deadline <= vietnamToday(new Date()) ||
          effectiveJobStatus(job, vietnamToday(new Date())) === "expired")
      )
        return "Cập nhật hạn nộp trong tương lai trước khi mở lại tin.";
      setJobs((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status, updated_at: new Date().toISOString() }
            : item,
        ),
      );
      return null;
    },
    reviewApplication: (id: number) =>
      setApplications((current) =>
        current.map((app) =>
          app.id === id && app.status === "applied" && app.cv_path
            ? {
                ...app,
                status: "waiting",
                reviewed_at: app.reviewed_at ?? new Date().toISOString(),
              }
            : app,
        ),
      ),
    setApplicationStatus: (id: number, status: ApplicationStatus) => {
      const app = applications.find((item) => item.id === id);
      if (
        !app ||
        app.status === "withdrawn" ||
        !(
          status === "accepted" ||
          status === "rejected" ||
          (status === "waiting" && !!app.reviewed_at)
        )
      )
        return "Không thể cập nhật hồ sơ đã rút hoặc không tồn tại.";
      setApplications((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      return null;
    },
    openConversation: (applicationId: number) => {
      const app = applications.find((item) => item.id === applicationId);
      if (
        !app ||
        !jobs.some(
          (job) => job.id === app.job_id && job.company_id === company.id,
        )
      )
        return null;
      const existing = conversations.find(
        (item) => item.application_id === applicationId,
      );
      if (existing) return existing.id;
      if (app.status === "withdrawn") return null;
      const id = Math.max(0, ...conversations.map((item) => item.id)) + 1;
      setConversations((current) => [
        ...current,
        {
          id,
          application_id: app.id,
          candidate_id: app.candidate_user_id,
          employer_id: initial.user.id,
          job_id: app.job_id,
        },
      ]);
      return id;
    },
    setDraft: (id: number, text: string) =>
      setDrafts((current) => ({ ...current, [id]: text })),
    sendMessage: (id: number) => {
      const message = (drafts[id] ?? "").trim();
      if (!message || message.length > 1000)
        return "Nhập tin nhắn từ 1 đến 1.000 ký tự.";
      if (
        !conversations.some(
          (conv) => conv.id === id && conv.employer_id === initial.user.id,
        )
      )
        return "Không tìm thấy hội thoại.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          conversation_id: id,
          sender_id: initial.user.id,
          message,
          created_at: new Date().toISOString(),
          is_read: false,
        },
      ]);
      setDrafts((current) => ({ ...current, [id]: "" }));
      return null;
    },
    markConversationRead: (id: number) =>
      setMessages((current) =>
        current.map((message) =>
          message.conversation_id === id &&
          message.sender_id !== initial.user.id
            ? { ...message, is_read: true }
            : message,
        ),
      ),
    markRead: (id?: number) =>
      setNotifications((current) =>
        current.map((notification) =>
          id === undefined || notification.id === id
            ? {
                ...notification,
                read_at: notification.read_at ?? new Date().toISOString(),
              }
            : notification,
        ),
      ),
  };
}
const EmployerContext = createContext<ReturnType<
  typeof useEmployerState
> | null>(null);
export function EmployerProvider({
  initial,
  children,
}: {
  initial: EmployerData;
  children: ReactNode;
}) {
  const state = useEmployerState(initial);
  return (
    <EmployerContext.Provider value={state}>
      {children}
    </EmployerContext.Provider>
  );
}
export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) throw new Error("Employer workspace is unavailable.");
  return context;
}
