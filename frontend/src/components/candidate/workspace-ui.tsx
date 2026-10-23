"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Inbox, Trash2 } from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogMedia,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/cores/shadcn/components/ui/alert-dialog";

export function WorkspaceTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="cu-card cu-title">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
export function WorkspaceEmpty({
  title,
  children,
  href = "/jobs",
  link = "Khám phá việc làm",
}: {
  title: string;
  children?: ReactNode;
  href?: string;
  link?: string;
}) {
  return (
    <div className="cu-empty">
      <Inbox aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      <Link className="cu-link" href={href}>
        {link}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
export function ConfirmRemoval({
  label,
  title,
  onConfirm,
  focusId,
}: {
  label: string;
  title: string;
  onConfirm: () => void;
  focusId: string;
}) {
  const [open, setOpen] = useState(false);
  const confirmed = useRef(false);
  useLayoutEffect(() => () => setOpen(false), []);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" type="button" size="icon" aria-label={label}>
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (confirmed.current) {
            event.preventDefault();
            document.getElementById(focusId)?.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Thay đổi này chỉ áp dụng cho bản xem trước hiện tại.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              confirmed.current = true;
              onConfirm();
              requestAnimationFrame(() =>
                document.getElementById(focusId)?.focus(),
              );
            }}
          >
            Xác nhận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function workspaceDate(value: string, time = false) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value));
}
