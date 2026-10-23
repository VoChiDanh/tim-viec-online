"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCheck, FileCheck, MessageSquare } from "lucide-react";
import { pageSlice } from "@/features/candidate-workspace/rules";
import { candidateNotificationHref } from "@/features/candidate-workspace/notification-link";
import { RelativeTime } from "@/components/feedback/relative-time";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceEmpty, WorkspaceTitle } from "./workspace-ui";

export function CandidateNotifications() {
  const state = useWorkspace();
  const params = useSearchParams();
  const filter = ["read", "unread"].includes(params.get("read") ?? "")
    ? params.get("read")!
    : "all";
  const unread = state.notifications.filter((item) => !item.read_at).length;
  const items = state.notifications.filter(
    (item) =>
      filter === "all" || (filter === "read" ? !!item.read_at : !item.read_at),
  );
  const rawPage = Number(params.get("page"));
  const result = pageSlice(
    items,
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  );
  return (
    <WorkspaceFrame section="notifications">
      <WorkspaceTitle title="Thông báo của bạn">
        <Button
          variant="ghost"
          type="button"
          onClick={() => state.markRead()}
          disabled={!unread}
        >
          <CheckCheck aria-hidden="true" />
          Đánh dấu tất cả đã đọc
        </Button>
      </WorkspaceTitle>
      <section className="cu-card" aria-label="Thông báo ứng tuyển và tin nhắn">
        <h2 className="cu-notification-heading">Ứng tuyển & tin nhắn</h2>
        <div
          className="cu-notification-filters"
          aria-label="Lọc trạng thái đọc"
        >
          {[
            ["all", "Tất cả"],
            ["unread", `Chưa đọc (${unread})`],
            ["read", "Đã đọc"],
          ].map(([value, label]) => (
            <Link
              href={`/account/notifications?read=${value}`}
              key={value}
              aria-current={filter === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        {!items.length && (
          <WorkspaceEmpty
            title="Không có thông báo trong mục này"
            href="/account/notifications"
            link="Xem tất cả thông báo"
          />
        )}
        {result.items.map((item) => (
          <article
            className="cu-notification"
            data-unread={!item.read_at}
            key={item.id}
          >
            {item.type === "new_message" ? (
              <MessageSquare aria-hidden="true" />
            ) : (
              <FileCheck aria-hidden="true" />
            )}
            <div>
              <h2>{item.title}</h2>
              <p>{item.content}</p>
              <Link
                href={candidateNotificationHref(
                  item,
                  state.applications,
                  state.conversations,
                )}
                className="cu-link"
                onClick={() => state.markRead(item.id)}
              >
                {item.type === "new_message"
                  ? "Xem tin nhắn"
                  : "Theo dõi ứng tuyển"}
              </Link>
              <p className="cu-muted">
                <RelativeTime value={item.created_at} /> ·{" "}
                {item.read_at ? "Đã đọc" : "Chưa đọc"}
              </p>
              {!item.read_at && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => state.markRead(item.id)}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </div>
          </article>
        ))}
        <Pagination
          page={result.page}
          lastPage={result.lastPage}
          pageUrl={(page) =>
            `/account/notifications?read=${filter}&page=${page}`
          }
          label="Phân trang thông báo"
        />
      </section>
    </WorkspaceFrame>
  );
}
