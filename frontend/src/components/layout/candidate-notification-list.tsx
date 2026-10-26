"use client";

import Link from "next/link";
import { Bell, CheckCheck, FileCheck, MessageSquare } from "lucide-react";
import { useWorkspace } from "@/components/candidate/workspace-provider";
import { candidateNotificationHref } from "@/features/candidate-workspace/notification-link";
import { RelativeTime } from "@/components/feedback/relative-time";
import { SheetClose } from "@/modules/cores/shadcn/components/ui/sheet";
import { Button } from "@/modules/cores/shadcn/components/ui/button";

export function CandidateNotificationList() {
  const state = useWorkspace();
  const unread = state.notifications.filter((item) => !item.read_at).length;
  const items = [...state.notifications]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
  return (
    <>
      <div className="notification-toolbar">
        <p role="status">
          {unread
            ? `${unread} thông báo chưa đọc`
            : "Bạn đã đọc tất cả thông báo"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!unread}
          onClick={() => state.markRead()}
        >
          <CheckCheck aria-hidden="true" /> Đọc tất cả
        </Button>
      </div>
      <div className="notification-list">
        {!items.length && (
          <div className="notification-empty">
            <Bell size={40} aria-hidden="true" />
            <h2>Chưa có thông báo</h2>
            <p>Các phản hồi ứng tuyển và tin nhắn mới sẽ xuất hiện tại đây.</p>
          </div>
        )}
        {items.map((item) => (
          <article
            className="notification-item"
            data-unread={!item.read_at}
            key={item.id}
          >
            {item.type === "new_message" ? (
              <MessageSquare size={20} aria-hidden="true" />
            ) : (
              <FileCheck size={20} aria-hidden="true" />
            )}
            <div>
              <SheetClose asChild>
                <Link
                  href={candidateNotificationHref(
                    item,
                    state.applications,
                    state.conversations,
                  )}
                  onClick={() => state.markRead(item.id)}
                >
                  <h2>{item.title}</h2>
                  <p>{item.content}</p>
                  <span className="notification-timestamp">
                    <RelativeTime value={item.created_at} /> ·{" "}
                    {item.read_at ? "Đã đọc" : "Chưa đọc"}
                  </span>
                </Link>
              </SheetClose>
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
      </div>
      <div className="notification-list-footer">
        <SheetClose asChild>
          <Link className="notification-login" href="/account/notifications">
            Xem tất cả thông báo
          </Link>
        </SheetClose>
      </div>
    </>
  );
}
