"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Info,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { isJobOpen, vietnamToday } from "@/features/jobs/formatters";
import { normalizeSearch } from "@/features/jobs/query";
import { APPLICATION_LABELS } from "@/features/employer/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
import { useChatScroll } from "@/components/candidate/use-chat-scroll";
import { useEmployer } from "./employer-provider";
import "./employer-messages.css";

const date = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("");
function resizeComposer(node: HTMLTextAreaElement | null) {
  if (!node?.clientWidth) return;
  node.style.height = "auto";
  node.style.height = `${Math.min(132, Math.max(44, node.scrollHeight))}px`;
  node.style.overflowY = node.scrollHeight > 132 ? "auto" : "hidden";
}

export function EmployerMessages() {
  const state = useEmployer();
  const { markConversationRead } = state;
  const router = useRouter();
  const requested = useSearchParams().get("conversation");
  const conversations = state.conversations.filter(
    (item) =>
      item.employer_id === state.user.id &&
      state.applications.some(
        (application) =>
          application.id === item.application_id &&
          application.job_id === item.job_id &&
          application.candidate_user_id === item.candidate_id,
      ),
  );
  const conversation =
    conversations.find((item) => String(item.id) === requested) ??
    (requested === null ? conversations[0] : undefined);
  const application = state.applications.find(
    (item) => item.id === conversation?.application_id,
  );
  const job = state.jobs.find((item) => item.id === conversation?.job_id);
  const activeId = conversation?.id;
  const messages = state.messages.filter(
    (item) => item.conversation_id === activeId,
  );
  const hasUnread = messages.some(
    (item) => item.sender_id !== state.user.id && !item.is_read,
  );
  const draft = activeId === undefined ? "" : (state.drafts[activeId] ?? "");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<{ id: number; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousRequested = useRef(requested);
  const { scrollRef, onScroll, scrollBottom, atBottom } = useChatScroll(
    activeId,
    messages.at(-1)?.id,
    requested,
  );
  useEffect(() => {
    if (requested === null && window.matchMedia("(max-width: 760px)").matches)
      return;
    if (activeId !== undefined && hasUnread) markConversationRead(activeId);
  }, [activeId, hasUnread, markConversationRead, requested]);
  useLayoutEffect(
    () => resizeComposer(composer.current),
    [draft, activeId, requested],
  );
  useEffect(() => {
    const resize = () => resizeComposer(composer.current);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (previousRequested.current === requested) return;
    if (requested !== null) heading.current?.focus({ preventScroll: true });
    else
      (
        document.getElementById(
          `em-conversation-${previousRequested.current}`,
        ) ?? searchInput.current
      )?.focus({ preventScroll: true });
    previousRequested.current = requested;
  }, [requested]);
  const send = () => {
    if (!conversation) return;
    const issue = state.sendMessage(conversation.id);
    setError(issue ? { id: conversation.id, text: issue } : null);
    if (!issue) {
      scrollBottom();
      setAnnouncement("Tin nhắn đã được thêm vào bản xem trước.");
    }
    composer.current?.focus({ preventScroll: true });
  };
  const visible = conversations.filter((item) => {
    const person = state.applications.find(
      (application) => application.id === item.application_id,
    );
    const position = state.jobs.find((job) => job.id === item.job_id);
    return normalizeSearch(
      `${person?.name ?? ""} ${position?.title ?? ""}`,
    ).includes(normalizeSearch(search));
  });
  const activeError = error && error.id === activeId ? error.text : "";
  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>Tin nhắn</h1>
          <p>Trao đổi với ứng viên theo từng hồ sơ và vị trí tuyển dụng.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/employer/candidates">
            <Users aria-hidden="true" />
            Hồ sơ ứng viên
          </Link>
        </Button>
      </div>
      <section
        className="ep-panel em-chat"
        data-open={requested !== null}
        aria-label="Tin nhắn tuyển dụng"
      >
        <aside className="em-chat-list" aria-label="Danh sách hội thoại">
          <div className="em-chat-list-heading">
            <h2>Hội thoại</h2>
            <span className="ep-pill">{conversations.length}</span>
          </div>
          <Field className="em-chat-search">
            <FieldLabel htmlFor="em-conversation-search" className="sr-only">
              Tìm hội thoại
            </FieldLabel>
            <div>
              <Search size={17} aria-hidden="true" />
              <Input
                ref={searchInput}
                id="em-conversation-search"
                value={search}
                placeholder="Tìm ứng viên, vị trí…"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xóa tìm hội thoại"
                  onClick={() => {
                    setSearch("");
                    searchInput.current?.focus();
                  }}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </Field>
          <div className="em-chat-threads">
            {!visible.length && (
              <div className="em-chat-empty" role="status">
                <MessageSquare aria-hidden="true" />
                <strong>
                  {search
                    ? "Không tìm thấy hội thoại"
                    : "Chưa có cuộc trò chuyện"}
                </strong>
                <p>
                  {search
                    ? "Thử tên ứng viên hoặc vị trí khác."
                    : "Mở hồ sơ ứng tuyển để bắt đầu trao đổi với ứng viên."}
                </p>
              </div>
            )}
            {visible.map((item) => {
              const person = state.applications.find(
                (application) => application.id === item.application_id,
              )!;
              const position = state.jobs.find((job) => job.id === item.job_id);
              const threadMessages = state.messages.filter(
                (message) => message.conversation_id === item.id,
              );
              const last = threadMessages.at(-1);
              const unread = threadMessages.filter(
                (message) =>
                  message.sender_id !== state.user.id && !message.is_read,
              ).length;
              return (
                <button
                  type="button"
                  id={`em-conversation-${item.id}`}
                  key={item.id}
                  className="em-chat-thread"
                  aria-pressed={activeId === item.id}
                  onClick={() => {
                    setError(null);
                    setAnnouncement("");
                    router.replace(
                      `/employer/messages?conversation=${item.id}`,
                      { scroll: false },
                    );
                  }}
                >
                  <span className="em-chat-avatar">
                    {initials(person.name)}
                  </span>
                  <span className="em-chat-thread-copy">
                    <span className="em-chat-thread-top">
                      <strong>{person.name}</strong>
                      {last && (
                        <time dateTime={last.created_at}>
                          {vietnamToday(new Date(last.created_at)) ===
                          state.today
                            ? time(last.created_at)
                            : date(last.created_at).slice(0, 5)}
                        </time>
                      )}
                    </span>
                    <span className="em-chat-position">{position?.title}</span>
                    <span className="em-chat-thread-context">
                      Tin #{item.job_id} · Hồ sơ #{person.id}
                    </span>
                    <span className="em-chat-preview">
                      {last
                        ? `${last.sender_id === state.user.id ? "Bạn: " : ""}${last.message}`
                        : "Bắt đầu cuộc trò chuyện"}
                    </span>
                  </span>
                  {unread > 0 && (
                    <span
                      className="em-chat-unread"
                      aria-label={`${unread} tin nhắn chưa đọc`}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="em-chat-list-note">
            <ShieldCheck size={16} aria-hidden="true" />
            Hội thoại liên kết với hồ sơ ứng tuyển vào công ty.
          </p>
        </aside>
        <section
          className="em-chat-detail"
          aria-labelledby={
            conversation && application && job ? "em-chat-title" : undefined
          }
        >
          {conversation && application && job ? (
            <>
              <header className="em-chat-heading">
                <Button
                  className="em-chat-back"
                  variant="ghost"
                  size="icon"
                  aria-label="Danh sách hội thoại"
                  onClick={() =>
                    router.replace("/employer/messages", { scroll: false })
                  }
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <span className="em-chat-avatar">
                  {initials(application.name)}
                </span>
                <div>
                  <h2 id="em-chat-title" ref={heading} tabIndex={-1}>
                    {application.name}
                  </h2>
                  <p>
                    Hồ sơ #{application.id} · {application.title}
                  </p>
                </div>
                <Link
                  href={`/employer/candidates/${application.id}`}
                  className="ep-text-link em-chat-profile"
                >
                  Xem hồ sơ ứng tuyển
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </header>
              <div className="em-chat-context">
                <BriefcaseBusiness size={18} aria-hidden="true" />
                <div>
                  <span className="em-chat-context-label">
                    Vị trí ứng tuyển
                  </span>
                  <strong>{job.title}</strong>
                  <p>
                    Tin #{job.id} · Hồ sơ #{application.id} ·{" "}
                    {APPLICATION_LABELS[application.status]}
                  </p>
                </div>
                <span className="ep-pill">
                  {isJobOpen(job, state.today)
                    ? "Đang tuyển"
                    : "Tin đã đóng / hết hạn"}
                </span>
              </div>
              {!isJobOpen(job, state.today) && (
                <p className="em-chat-preserved">
                  <Info size={15} aria-hidden="true" />
                  Bạn vẫn có thể trao đổi với ứng viên khi tin tuyển dụng đã
                  đóng hoặc hết hạn.
                </p>
              )}
              <div className="em-chat-history">
                <div
                  className="em-chat-messages"
                  ref={scrollRef}
                  onScroll={onScroll}
                  role="region"
                  tabIndex={0}
                  aria-label={`Nội dung hội thoại với ${application.name}`}
                >
                  {!messages.length && (
                    <div className="em-chat-empty">
                      <MessageSquare aria-hidden="true" />
                      <strong>Bắt đầu trao đổi với {application.name}</strong>
                      <p>
                        Giới thiệu về vị trí hoặc hẹn thời gian trao đổi phù
                        hợp.
                      </p>
                    </div>
                  )}
                  {messages.map((message, index) => {
                    const outgoing = message.sender_id === state.user.id;
                    const messageDay = vietnamToday(
                      new Date(message.created_at),
                    );
                    return (
                      <Fragment key={message.id}>
                        {(index === 0 ||
                          vietnamToday(
                            new Date(messages[index - 1].created_at),
                          ) !== messageDay) && (
                          <div className="em-chat-date">
                            <time dateTime={messageDay}>
                              {messageDay === state.today
                                ? "Hôm nay"
                                : date(message.created_at)}
                            </time>
                          </div>
                        )}
                        <article
                          className="em-chat-message"
                          data-outgoing={outgoing}
                        >
                          <span className="sr-only">
                            {outgoing ? "Bạn" : application.name}
                          </span>
                          <p>{message.message}</p>
                          <small>
                            <time
                              dateTime={message.created_at}
                              title={date(message.created_at, true)}
                            >
                              {time(message.created_at)}
                            </time>
                            {outgoing && message.is_read ? " · Đã xem" : ""}
                          </small>
                        </article>
                      </Fragment>
                    );
                  })}
                </div>
                {!atBottom && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="em-chat-bottom"
                    onClick={scrollBottom}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                    Xuống cuối
                  </Button>
                )}
              </div>
              <form
                className="em-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <Field data-invalid={!!activeError}>
                  <FieldLabel htmlFor="em-message" className="sr-only">
                    Tin nhắn của bạn
                  </FieldLabel>
                  <div
                    className="em-chat-composer-box"
                    data-invalid={!!activeError}
                  >
                    <Textarea
                      ref={composer}
                      id="em-message"
                      rows={1}
                      maxLength={1000}
                      placeholder="Viết tin nhắn cho ứng viên…"
                      value={draft}
                      aria-invalid={!!activeError}
                      aria-describedby="em-message-hint em-message-error"
                      onChange={(event) => {
                        state.setDraft(conversation.id, event.target.value);
                        setError(null);
                        setAnnouncement("");
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          (event.ctrlKey || event.metaKey) &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          send();
                        }
                      }}
                    />
                    <Button type="submit" size="icon" aria-label="Gửi tin nhắn">
                      <Send size={18} aria-hidden="true" />
                    </Button>
                  </div>
                  <FieldError id="em-message-error">{activeError}</FieldError>
                </Field>
                <div className="em-chat-composer-meta">
                  <span id="em-message-hint">Ctrl/⌘ + Enter để gửi</span>
                  <span>{draft.length}/1.000</span>
                </div>
                <p className="sr-only" role="status">
                  {announcement}
                </p>
              </form>
            </>
          ) : (
            <div className="em-chat-empty em-chat-missing">
              <Button
                className="em-chat-back"
                variant="ghost"
                onClick={() =>
                  router.replace("/employer/messages", { scroll: false })
                }
              >
                <ArrowLeft aria-hidden="true" />
                Danh sách hội thoại
              </Button>
              <MessageSquare size={36} aria-hidden="true" />
              <h2>
                {requested !== null
                  ? "Không tìm thấy hội thoại"
                  : "Chưa có cuộc trò chuyện"}
              </h2>
              <p>
                Chỉ các hội thoại gắn với hồ sơ ứng tuyển vào công ty mới được
                hiển thị.
              </p>
              <Link href="/employer/candidates" className="ep-text-link">
                Xem hồ sơ ứng viên
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
