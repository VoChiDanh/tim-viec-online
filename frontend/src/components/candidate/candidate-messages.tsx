"use client";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  Search,
  Send,
  X,
} from "lucide-react";
import { isJobOpen } from "@/features/jobs/formatters";
import { normalizeSearch } from "@/features/jobs/query";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
import { useWorkspace } from "./workspace-provider";
import { useChatScroll } from "./use-chat-scroll";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceEmpty, WorkspaceTitle, workspaceDate } from "./workspace-ui";

const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const day = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
const companyMark = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 3)
    .join("");
function resizeComposer(node: HTMLTextAreaElement | null) {
  if (!node || !node.clientWidth) return;
  node.style.height = "auto";
  const height = Math.min(132, Math.max(44, node.scrollHeight));
  node.style.height = `${height}px`;
  node.style.overflowY = node.scrollHeight > 130 ? "auto" : "hidden";
}

export function CandidateMessages() {
  const state = useWorkspace();
  const router = useRouter();
  const requested = useSearchParams().get("conversation");
  const conversation =
    state.conversations.find((item) => String(item.id) === requested) ??
    (!requested ? state.conversations[0] : undefined);
  const job = state.jobs.find((item) => item.id === conversation?.job_id);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousConversation = useRef(requested);
  const activeId = conversation?.id;
  const draft = activeId === undefined ? "" : (state.drafts[activeId] ?? "");
  const messages = state.messages.filter(
    (item) => item.conversation_id === activeId,
  );
  const { scrollRef, onScroll, scrollBottom, atBottom } = useChatScroll(
    activeId,
    messages.at(-1)?.id,
    requested,
  );
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
    if (previousConversation.current === requested) return;
    if (requested) heading.current?.focus({ preventScroll: true });
    else {
      const previous = document.getElementById(
        `conversation-${previousConversation.current}`,
      );
      (previous && previous.getClientRects().length
        ? previous
        : searchInput.current
      )?.focus({ preventScroll: true });
    }
    previousConversation.current = requested;
  }, [requested]);
  const send = () => {
    if (!conversation) return;
    const nextError = state.sendPreview(conversation.id);
    setError(nextError ?? "");
    if (!nextError) {
      scrollBottom();
      setAnnouncement(
        "Tin nhắn đã được thêm vào bản xem trước, chưa gửi tới nhà tuyển dụng.",
      );
    }
    composer.current?.focus({ preventScroll: true });
  };
  const filtered = state.conversations.filter((item) => {
    const itemJob = state.jobs.find((job) => job.id === item.job_id);
    return normalizeSearch(
      `${itemJob?.company.name} ${itemJob?.title}`,
    ).includes(normalizeSearch(search));
  });
  return (
    <WorkspaceFrame section="messages">
      <WorkspaceTitle title="Tin nhắn">
        <Link href="/account/jobs" className="cu-link">
          Việc đã ứng tuyển
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </WorkspaceTitle>
      <section
        className="cu-card cc-workspace"
        data-open={!!requested}
        aria-label="Hộp thư ứng viên"
      >
        <aside className="cc-companies" aria-label="Danh sách hội thoại">
          <div className="cc-list-heading">
            <h2>Hội thoại</h2>
            <span>{state.conversations.length}</span>
          </div>
          <div className="cc-search">
            <Field>
              <FieldLabel htmlFor="conversation-search" className="sr-only">
                Tìm hội thoại
              </FieldLabel>
              <div className="cc-search-control">
                <Search aria-hidden="true" size={17} />
                <Input
                  ref={searchInput}
                  id="conversation-search"
                  placeholder="Tìm công ty, vị trí…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      searchInput.current?.focus();
                    }}
                    aria-label="Xóa tìm hội thoại"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </Field>
          </div>
          <div className="cc-thread-list">
            {!filtered.length && (
              <div className="cc-no-results" role="status">
                <Search size={24} aria-hidden="true" />
                <strong>Không tìm thấy hội thoại</strong>
                <p>Thử tên công ty hoặc vị trí khác.</p>
              </div>
            )}
            {filtered.map((item) => {
              const itemJob = state.jobs.find((job) => job.id === item.job_id)!;
              const last = state.messages
                .filter((message) => message.conversation_id === item.id)
                .at(-1);
              return (
                <button
                  id={`conversation-${item.id}`}
                  key={item.id}
                  type="button"
                  className="cc-company"
                  aria-pressed={item.id === activeId}
                  onClick={() => {
                    setError("");
                    setAnnouncement("");
                    if (requested === String(item.id))
                      heading.current?.focus({ preventScroll: true });
                    else
                      router.replace(
                        `/account/messages?conversation=${item.id}`,
                        { scroll: false },
                      );
                  }}
                >
                  <span className="cc-avatar">
                    {companyMark(itemJob.company.name)}
                  </span>
                  <span className="cc-company-copy">
                    <span className="cc-company-title">
                      <strong>{itemJob.company.name}</strong>
                      {last && (
                        <time dateTime={last.created_at}>
                          {day(last.created_at) === state.today
                            ? time(last.created_at)
                            : workspaceDate(last.created_at).slice(0, 5)}
                        </time>
                      )}
                    </span>
                    <span className="cc-company-position">{itemJob.title}</span>
                    <small>
                      {last?.outgoing ? "Bạn: " : ""}
                      {last?.message}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="cc-list-note">Hội thoại từ các hồ sơ đã ứng tuyển.</p>
        </aside>
        <section
          className="cc-conversation"
          aria-labelledby={job ? "chat-title" : undefined}
        >
          {job && conversation ? (
            <>
              <header className="cc-heading">
                <Button
                  className="cc-back"
                  variant="ghost"
                  type="button"
                  size="icon"
                  aria-label="Danh sách hội thoại"
                  onClick={() => {
                    setError("");
                    router.replace("/account/messages", { scroll: false });
                  }}
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <span className="cc-avatar">
                  {companyMark(job.company.name)}
                </span>
                <div className="cc-heading-copy">
                  <h2 id="chat-title" ref={heading} tabIndex={-1}>
                    {job.company.name}
                  </h2>
                  <p>{conversation.contact} · Tuyển dụng</p>
                </div>
                <Link
                  href={`/companies/${job.company_id}`}
                  className="cc-company-link"
                  aria-label={`Xem công ty ${job.company.name}`}
                >
                  <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
              </header>
              <div className="cc-context">
                <BriefcaseBusiness size={18} aria-hidden="true" />
                <div>
                  <Link href={`/jobs/${job.id}`}>
                    <strong>
                      {job.title}
                      <ChevronRight size={14} aria-hidden="true" />
                    </strong>
                  </Link>
                  <p>
                    {isJobOpen(job, state.today)
                      ? "Hồ sơ đã ứng tuyển"
                      : "Tin đã đóng / hết hạn. Bạn vẫn có thể tiếp tục trao đổi với nhà tuyển dụng."}
                  </p>
                </div>
              </div>
              <div className="cc-history">
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="cc-messages"
                  role="region"
                  tabIndex={0}
                  aria-label={`Nội dung hội thoại với ${job.company.name}`}
                >
                  {messages.map((message, index) => (
                    <Fragment key={message.id}>
                      {(index === 0 ||
                        day(messages[index - 1].created_at) !==
                          day(message.created_at)) && (
                        <div className="cc-date">
                          <time dateTime={day(message.created_at)}>
                            {day(message.created_at) === state.today
                              ? "Hôm nay"
                              : workspaceDate(message.created_at)}
                          </time>
                        </div>
                      )}
                      <article
                        className={`cc-message${message.outgoing ? " cc-outgoing" : ""}`}
                      >
                        <span className="sr-only">
                          {message.outgoing ? "Bạn" : conversation.contact}
                        </span>
                        <p>{message.message}</p>
                        <small>
                          <time
                            dateTime={message.created_at}
                            title={workspaceDate(message.created_at, true)}
                          >
                            {time(message.created_at)}
                          </time>
                          {message.preview && " · Chưa gửi"}
                        </small>
                      </article>
                    </Fragment>
                  ))}
                </div>
                {!atBottom && (
                  <Button
                    type="button"
                    variant="outline"
                    className="cc-scroll-bottom"
                    onClick={scrollBottom}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                    Xuống cuối
                  </Button>
                )}
              </div>
              <form
                className="cc-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="message-composer" className="sr-only">
                    Tin nhắn của bạn
                  </FieldLabel>
                  <div className="cc-composer-box" data-invalid={!!error}>
                    <Textarea
                      ref={composer}
                      id="message-composer"
                      name="message"
                      rows={1}
                      maxLength={1000}
                      placeholder="Viết tin nhắn…"
                      value={draft}
                      onChange={(event) => {
                        state.setDraft(conversation.id, event.target.value);
                        setError("");
                        setAnnouncement("");
                      }}
                      aria-invalid={!!error}
                      aria-describedby="message-hint message-error"
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
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Gửi"
                      className="cc-send"
                    >
                      <Send size={18} aria-hidden="true" />
                    </Button>
                  </div>
                  <FieldError id="message-error">{error}</FieldError>
                </Field>
                <div className="cc-composer-meta">
                  <span id="message-hint">Ctrl/⌘ + Enter để gửi</span>
                  <span>{draft.length}/1.000</span>
                </div>
                <p className="cc-preview-note">
                  Bản xem trước · Tin nhắn chưa gửi tới nhà tuyển dụng.
                </p>
                <p className="sr-only" role="status">
                  {announcement}
                </p>
              </form>
            </>
          ) : (
            <div className="cc-missing">
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  router.replace("/account/messages", { scroll: false })
                }
              >
                <ArrowLeft aria-hidden="true" />
                Danh sách hội thoại
              </Button>
              <WorkspaceEmpty
                title="Không tìm thấy hội thoại"
                href="/account/jobs"
                link="Xem hồ sơ đã ứng tuyển"
              >
                Chỉ các hội thoại gắn với hồ sơ đã ứng tuyển mới được hiển thị.
              </WorkspaceEmpty>
            </div>
          )}
        </section>
      </section>
    </WorkspaceFrame>
  );
}
