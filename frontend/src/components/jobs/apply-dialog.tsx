"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check, FileText, Info, LoaderCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/features/jobs/types";
import { MAX_COVER_LETTER } from "@/features/candidate-workspace/application";
import { validateCv } from "@/features/candidate-profile/validation";
import { useWorkspace } from "@/components/candidate/workspace-provider";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { Field, FieldLabel } from "@/modules/cores/shadcn/components/ui/field";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/modules/cores/shadcn/components/ui/dialog";

export function ApplyDialog({ job }: { job: Job }) {
  const state = useWorkspace();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const appliedLink = useRef<HTMLAnchorElement>(null);
  const applied = state.applications.some((item) => item.job_id === job.id);
  // Cached routes must release their portals when navigation hides them.
  useEffect(
    () => () => {
      setOpen(false);
      pendingRef.current = false;
      setPending(false);
    },
    [],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pendingRef.current) setOpen(next);
      }}
    >
      {applied ? (
        <Button asChild className="apply-button h-11 flex-1">
          <Link ref={appliedLink} href="/account/jobs?tab=applied">
            <Check aria-hidden="true" /> Đã ứng tuyển
          </Link>
        </Button>
      ) : (
        <DialogTrigger asChild>
          <Button className="apply-button h-11 flex-1">Ứng tuyển ngay</Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="job-apply-dialog"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (applied) {
            event.preventDefault();
            // The apply trigger becomes a history link after a successful submission.
            appliedLink.current?.focus();
          }
        }}
      >
        <DialogClose asChild>
          <Button
            className="absolute top-2 right-2"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label="Đóng"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader>
          <span className="apply-eyebrow">Ứng tuyển nhanh</span>
          <DialogTitle>Nộp hồ sơ ứng tuyển</DialogTitle>
          <DialogDescription>
            {job.title} · {job.company.name}
          </DialogDescription>
        </DialogHeader>
        <ApplyForm
          job={job}
          onComplete={() => setOpen(false)}
          onPendingChange={(value) => {
            pendingRef.current = value;
            setPending(value);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ApplyForm({
  job,
  onComplete,
  onPendingChange,
}: {
  job: Job;
  onComplete: () => void;
  onPendingChange: (value: boolean) => void;
}) {
  const state = useWorkspace();
  const id = useId();
  const [source, setSource] = useState<"existing" | "new">(
    state.cv ? "existing" : "new",
  );
  const [file, setFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const validation = useRef(0);
  const active = useRef(true);
  const submitLock = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function chooseFile(next: File | undefined) {
    const request = ++validation.current;
    setFile(null);
    setError("");
    if (!next) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const invalid = await validateCv(next);
      if (!active.current || request !== validation.current) return;
      if (invalid) setError(invalid);
      else setFile(next);
    } catch {
      if (active.current && request === validation.current)
        setError("Không đọc được tệp CV. Vui lòng chọn lại.");
    } finally {
      if (active.current && request === validation.current) setChecking(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || checking) return;
    const selected = source === "existing" ? state.cv : file;
    if (!selected) {
      setError("Vui lòng chọn CV PDF để ứng tuyển.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    onPendingChange(true);
    setError("");
    const result = await state.submitApplication({
      jobId: job.id,
      cv: selected,
      coverLetter,
    });
    submitLock.current = false;
    if (!active.current) return;
    setSubmitting(false);
    onPendingChange(false);
    if (!result.success) {
      setError(result.message);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    onComplete();
    toast.success("Đã thêm hồ sơ vào phiên xem trước.", {
      description: "Hồ sơ chưa được gửi tới nhà tuyển dụng.",
    });
  }

  return (
    <form
      onSubmit={submit}
      className="apply-form"
      aria-label="Hồ sơ ứng tuyển"
      aria-busy={submitting}
    >
      <fieldset disabled={submitting} className="apply-sources">
        <legend>
          CV ứng tuyển <span aria-hidden="true">*</span>
        </legend>
        <p className="apply-hint">Định dạng PDF, dung lượng tối đa 5 MB.</p>
        <label
          className="apply-source"
          data-selected={source === "existing"}
          data-disabled={!state.cv}
        >
          <input
            type="radio"
            name={`${id}-source`}
            value="existing"
            checked={source === "existing"}
            disabled={!state.cv}
            onChange={() => {
              setSource("existing");
              setError("");
            }}
          />
          <FileText aria-hidden="true" />
          <span>
            <strong>CV trong hồ sơ</strong>
            <small>
              {state.cv?.name ?? "Bạn chưa chọn CV trong hồ sơ cá nhân"}
            </small>
          </span>
        </label>
        <label className="apply-source" data-selected={source === "new"}>
          <input
            type="radio"
            name={`${id}-source`}
            value="new"
            checked={source === "new"}
            onChange={() => {
              setSource("new");
              setError("");
            }}
          />
          <Upload aria-hidden="true" />
          <span>
            <strong>Chọn CV khác cho vị trí này</strong>
            <small>Giữ nguyên CV mặc định trong hồ sơ của bạn.</small>
          </span>
        </label>
        {source === "new" && (
          <Field className="apply-file">
            <FieldLabel htmlFor={`${id}-file`}>Chọn CV PDF</FieldLabel>
            <Input
              ref={fileInput}
              className="sr-only"
              tabIndex={-1}
              id={`${id}-file`}
              type="file"
              accept=".pdf,application/pdf"
              aria-describedby={`${id}-file-status`}
              aria-invalid={!!error && !file}
              onChange={(event) => {
                void chooseFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden="true" />
              Chọn tệp PDF
            </Button>
            <p id={`${id}-file-status`} className="apply-hint" role="status">
              {checking
                ? "Đang kiểm tra tệp…"
                : file
                  ? `Đã chọn: ${file.name} · ${Math.max(1, Math.ceil(file.size / 1024))} KB`
                  : "Chưa chọn tệp"}
            </p>
          </Field>
        )}
      </fieldset>
      <dl className="apply-contact">
        <div>
          <dt>Ứng viên</dt>
          <dd>{state.profile.name}</dd>
        </div>
        <div>
          <dt>Email liên hệ</dt>
          <dd>{state.profile.email}</dd>
        </div>
      </dl>
      <Field>
        <FieldLabel htmlFor={`${id}-letter`}>
          Thư giới thiệu <span className="apply-hint">(không bắt buộc)</span>
        </FieldLabel>
        <Textarea
          id={`${id}-letter`}
          rows={3}
          maxLength={MAX_COVER_LETTER}
          disabled={submitting}
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
          placeholder="Giới thiệu ngắn về kinh nghiệm và lý do bạn phù hợp với vị trí…"
          aria-describedby={`${id}-letter-count`}
        />
        <p id={`${id}-letter-count`} className="apply-count">
          {coverLetter.length.toLocaleString("vi-VN")}/
          {MAX_COVER_LETTER.toLocaleString("vi-VN")}
        </p>
      </Field>
      <p className="apply-notice">
        <Info aria-hidden="true" />
        Mỗi công việc chỉ nhận một hồ sơ ứng tuyển của bạn.
      </p>
      <p className="apply-hint">
        Chế độ xem trước: CV chỉ được giữ trong phiên này, chưa gửi tới nhà
        tuyển dụng.
      </p>
      {error && (
        <p ref={errorRef} tabIndex={-1} className="apply-error" role="alert">
          {error}
        </p>
      )}
      <div className="apply-footer">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={submitting}>
            Hủy bỏ
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="apply-button"
          disabled={checking || submitting}
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {submitting ? "Đang kiểm tra…" : "Xác nhận ứng tuyển"}
        </Button>
      </div>
    </form>
  );
}
