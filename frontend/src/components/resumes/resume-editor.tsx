"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Save, Upload, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/features/api/client";
import { documentFromDetail, resumeFileUrl } from "@/features/resumes/client";
import {
  resumeDocumentSchema,
  validateForExport,
  type ResumeDocument,
} from "@/features/resumes/schema";
import type { ResumeDetail, ResumeExport } from "@/features/resumes/types";
import { ResumeAutosave, type SaveStatus } from "@/features/resumes/autosave";
import { RESUME_TEMPLATES } from "@/features/resumes/templates";
import { ResumeSections } from "./resume-sections";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";

const Preview = dynamic(
  () => import("./resume-preview").then((module) => module.ResumePreview),
  {
    ssr: false,
    loading: () => (
      <div className="resume-preview-placeholder">Đang tải bản xem trước…</div>
    ),
  },
);
const statusLabels: Record<SaveStatus, string> = {
  saved: "Đã lưu",
  dirty: "Có thay đổi chưa lưu",
  saving: "Đang lưu…",
  error: "Lưu thất bại",
  conflict: "Có xung đột phiên bản",
};
export function ResumeEditor({
  id,
  connected,
}: {
  id: number;
  connected: boolean;
}) {
  const [initial, setInitial] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!connected) return;
    let active = true;
    apiRequest<ResumeDetail>(`/candidate/resumes/${id}`)
      .then((result) => {
        if (active) setInitial(result.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, connected]);
  if (!connected)
    return <p className="resume-notice">Trình tạo CV cần kết nối API.</p>;
  if (error)
    return (
      <p role="alert" className="resume-error">
        {error}
      </p>
    );
  if (!initial)
    return (
      <div className="resume-skeleton" aria-label="Đang mở CV" aria-busy="true">
        <div />
        <div />
        <div />
      </div>
    );
  return <Editor key={initial.id} initial={initial} />;
}
function Editor({ initial }: { initial: ResumeDetail }) {
  const router = useRouter();
  const [doc, setDoc] = useState(() => documentFromDetail(initial));
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(initial.revision);
  const [tab, setTab] = useState("content");
  const [exported, setExported] = useState<ResumeExport | null>(
    initial.latest_export,
  );
  const [pollExpired, setPollExpired] = useState(false);
  const engine = useRef<ResumeAutosave<ResumeDocument> | null>(null);
  useEffect(() => {
    const saver = new ResumeAutosave<ResumeDocument>(
      initial.revision,
      async (value, base_revision, signal) => {
        const parsed = resumeDocumentSchema.safeParse(value);
        if (!parsed.success)
          throw new Error(
            parsed.error.issues[0]?.message || "Kiểm tra nội dung CV.",
          );
        const result = await apiRequest<ResumeDetail>(
          `/candidate/resumes/${initial.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ ...parsed.data, base_revision }),
            signal,
          },
        );
        if (signal.aborted) throw new Error("Phiên chỉnh sửa đã đóng.");
        setRevision(result.data.revision);
        return result.data.revision;
      },
      (state, failure) => {
        setStatus(state);
        if (failure) setError((failure as Error).message);
        else setError("");
      },
    );
    engine.current = saver;
    const warn = (event: BeforeUnloadEvent) => {
      if (saver.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      saver.dispose();
      engine.current = null;
      window.removeEventListener("beforeunload", warn);
    };
  }, [initial.id, initial.revision]);
  function change(value: ResumeDocument) {
    setDoc(value);
    engine.current?.change(value);
  }
  async function save() {
    try {
      await engine.current?.flush();
      toast.success("Đã lưu CV.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copyDirty() {
    setBusy(true);
    try {
      const created = await apiRequest<ResumeDetail>("/candidate/resumes", {
        method: "POST",
        body: JSON.stringify({
          name: `${doc.name.slice(0, 105)} (bản sao)`,
          template_key: doc.template_key,
          prefill_from_profile: false,
        }),
      });
      const copy = structuredClone(doc);
      copy.name = created.data.name;
      copy.content.basics.photo_asset_id = null;
      if (doc.content.basics.photo_asset_id) {
        const image = await fetch(
          resumeFileUrl(
            `/api/candidate/resumes/${initial.id}/assets/${doc.content.basics.photo_asset_id}`,
          ),
          { cache: "no-store" },
        );
        if (!image.ok)
          throw new Error(
            "Không thể sao chép ảnh CV. Bản nháp mới đã được giữ để bạn tiếp tục.",
          );
        const body = new FormData();
        body.set("image", await image.blob(), "photo.png");
        const asset = await apiRequest<{ id: number }>(
          `/candidate/resumes/${created.data.id}/assets`,
          { method: "POST", body },
        );
        copy.content.basics.photo_asset_id = asset.data.id;
      }
      await apiRequest(`/candidate/resumes/${created.data.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...copy, base_revision: 1 }),
      });
      router.push(`/account/resumes/${created.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function exportPdf() {
    setBusy(true);
    setError("");
    try {
      validateForExport(doc);
      const current = await engine.current!.flush();
      const result = await apiRequest<ResumeExport>(
        `/candidate/resumes/${initial.id}/exports`,
        { method: "POST", body: JSON.stringify({ revision: current }) },
      );
      setExported(result.data);
      setPollExpired(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkExport() {
    if (!exported) return;
    try {
      const result = await apiRequest<ResumeExport>(
        `/candidate/resume-exports/${exported.id}`,
      );
      setExported(result.data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const exportId = exported?.id;
  const exportStatus = exported?.status;
  useEffect(() => {
    if (
      !exportId ||
      !exportStatus ||
      !["pending", "processing"].includes(exportStatus)
    )
      return;
    const controller = new AbortController();
    const started = Date.now();
    const id = exportId;
    const timer = setInterval(() => {
      if (Date.now() - started > 60000) {
        setPollExpired(true);
        clearInterval(timer);
        return;
      }
      if (document.visibilityState !== "visible") return;
      apiRequest<ResumeExport>(`/candidate/resume-exports/${id}`, {
        signal: controller.signal,
      })
        .then((result) => setExported(result.data))
        .catch(() => {});
    }, 2000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [exportId, exportStatus]);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (
      file.size > 2097152 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Chọn ảnh JPEG, PNG hoặc WebP tối đa 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("image", file);
      const result = await apiRequest<{ id: number }>(
        `/candidate/resumes/${initial.id}/assets`,
        { method: "POST", body },
      );
      change({
        ...doc,
        content: {
          ...doc.content,
          basics: { ...doc.content.basics, photo_asset_id: result.data.id },
        },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const basics = doc.content.basics;
  function basic(key: string, value: string) {
    change({
      ...doc,
      content: { ...doc.content, basics: { ...basics, [key]: value } },
    });
  }
  return (
    <section className="resume-editor" data-tab={tab}>
      <header className="resume-editor-toolbar">
        <Link
          href="/account/resumes"
          onClick={(event) => {
            if (
              engine.current?.dirty &&
              !window.confirm("CV còn thay đổi chưa lưu. Bạn muốn rời trang?")
            )
              event.preventDefault();
          }}
          aria-label="Về CV của tôi"
        >
          <ArrowLeft size={20} />
        </Link>
        <label className="resume-name">
          <span className="sr-only">Tên CV</span>
          <Input
            value={doc.name}
            maxLength={120}
            disabled={busy || !initial.capabilities.edit}
            onChange={(e) => change({ ...doc, name: e.target.value })}
          />
        </label>
        <span role="status" className="resume-save-status" data-status={status}>
          {statusLabels[status]}
        </span>
        <Button
          variant="outline"
          disabled={busy || !initial.capabilities.edit || status === "conflict"}
          onClick={save}
        >
          <Save size={16} />
          Lưu ngay
        </Button>
        <Button
          disabled={busy || !initial.capabilities.edit || status === "conflict"}
          onClick={exportPdf}
        >
          <Download size={16} />
          {busy ? "Đang xử lý…" : "Xuất PDF"}
        </Button>
      </header>
      {error && (
        <p role="alert" className="resume-error">
          {error}
        </p>
      )}
      {status === "conflict" && (
        <div className="resume-notice">
          <p>
            Nội dung đang sửa được giữ ở đây. Tải phiên bản mới sẽ bỏ thay đổi
            chưa lưu.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tải phiên bản mới
          </Button>
          <Button onClick={copyDirty} disabled={busy}>
            <Copy size={16} />
            Lưu thành CV mới
          </Button>
        </div>
      )}
      {exported && (
        <div className="resume-export-status" role="status">
          <span>
            PDF phiên bản {exported.revision}
            {exported.revision !== revision
              ? " · Có nội dung mới hơn"
              : ""}:{" "}
            {exported.status === "ready"
              ? `${exported.page_count} trang, sẵn sàng`
              : exported.status === "failed"
                ? "Xuất thất bại. Kiểm tra nội dung và thử xuất lại."
                : "Đang tạo PDF…"}
          </span>
          {exported.file_url && (
            <a
              href={resumeFileUrl(exported.file_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở / tải PDF
            </a>
          )}
          {pollExpired && (
            <Button variant="outline" onClick={checkExport}>
              Kiểm tra lại
            </Button>
          )}
        </div>
      )}
      <div
        className="resume-mobile-tabs"
        role="tablist"
        aria-label="Chế độ chỉnh sửa"
      >
        <button
          role="tab"
          aria-selected={tab === "content"}
          onClick={() => setTab("content")}
        >
          Nội dung
        </button>
        <button
          role="tab"
          aria-selected={tab === "preview"}
          onClick={() => setTab("preview")}
        >
          Xem trước
        </button>
      </div>
      <div className="resume-editor-grid">
        <fieldset
          className="resume-editor-fields"
          disabled={!initial.capabilities.edit || busy}
        >
          <legend className="sr-only">Nội dung CV</legend>
          <section className="resume-section-editor">
            <h1>Thiết kế CV</h1>
            <div className="resume-form-row">
              <label>
                Mẫu CV
                <select
                  value={doc.template_key}
                  aria-label="Mẫu CV"
                  onChange={(e) =>
                    change({
                      ...doc,
                      template_key: e.target
                        .value as ResumeDocument["template_key"],
                    })
                  }
                >
                  {RESUME_TEMPLATES.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Màu nhấn
                <select
                  value={doc.settings.accent}
                  aria-label="Màu nhấn"
                  onChange={(e) =>
                    change({
                      ...doc,
                      settings: {
                        ...doc.settings,
                        accent: e.target
                          .value as ResumeDocument["settings"]["accent"],
                      },
                    })
                  }
                >
                  <option value="blue">Xanh biển</option>
                  <option value="teal">Xanh ngọc</option>
                  <option value="slate">Xám xanh</option>
                </select>
              </label>
              <label>
                Cỡ chữ
                <select
                  value={doc.settings.font_size}
                  aria-label="Cỡ chữ"
                  onChange={(e) =>
                    change({
                      ...doc,
                      settings: {
                        ...doc.settings,
                        font_size: e.target
                          .value as ResumeDocument["settings"]["font_size"],
                      },
                    })
                  }
                >
                  <option value="small">Nhỏ</option>
                  <option value="normal">Vừa</option>
                  <option value="large">Lớn</option>
                </select>
              </label>
              <label>
                Giãn dòng
                <select
                  value={doc.settings.line_spacing}
                  aria-label="Giãn dòng"
                  onChange={(e) =>
                    change({
                      ...doc,
                      settings: {
                        ...doc.settings,
                        line_spacing: e.target
                          .value as ResumeDocument["settings"]["line_spacing"],
                      },
                    })
                  }
                >
                  <option value="normal">Thoáng</option>
                  <option value="compact">Gọn</option>
                </select>
              </label>
            </div>
          </section>
          <section className="resume-section-editor">
            <h2>Thông tin cá nhân</h2>
            {Object.entries({
              full_name: "Họ và tên",
              headline: "Chức danh / vị trí mong muốn",
              email: "Email",
              phone: "Số điện thoại",
              city: "Địa điểm",
            }).map(([key, label]) => (
              <label key={key}>
                {label}
                <Input
                  type={key === "email" ? "email" : "text"}
                  value={basics[key as keyof typeof basics] as string}
                  maxLength={
                    key === "full_name"
                      ? 120
                      : key === "email"
                        ? 254
                        : key === "phone"
                          ? 30
                          : 150
                  }
                  onChange={(e) => basic(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              Giới thiệu / mục tiêu nghề nghiệp
              <Textarea
                rows={4}
                maxLength={2000}
                value={basics.summary}
                onChange={(e) => basic("summary", e.target.value)}
              />
            </label>
            <div className="resume-photo-tools">
              <label className="resume-upload">
                <Upload size={16} />
                Ảnh CV
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {basics.photo_asset_id && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    change({
                      ...doc,
                      content: {
                        ...doc.content,
                        basics: { ...basics, photo_asset_id: null },
                      },
                    })
                  }
                >
                  <Trash2 size={16} />
                  Bỏ ảnh khỏi CV
                </Button>
              )}
              <small>JPEG, PNG, WebP · tối đa 2 MB</small>
            </div>
            {basics.links.map((link, index) => (
              <div key={link.id} className="resume-link-entry">
                <label>
                  Nhãn liên kết
                  <Input
                    value={link.label}
                    maxLength={100}
                    onChange={(e) => {
                      const next = structuredClone(doc);
                      next.content.basics.links[index].label = e.target.value;
                      change(next);
                    }}
                  />
                </label>
                <label>
                  URL
                  <Input
                    type="url"
                    value={link.url}
                    maxLength={1000}
                    onChange={(e) => {
                      const next = structuredClone(doc);
                      next.content.basics.links[index].url = e.target.value;
                      change(next);
                    }}
                  />
                </label>
                <Button
                  variant="ghost"
                  aria-label="Xóa liên kết"
                  onClick={() =>
                    change({
                      ...doc,
                      content: {
                        ...doc.content,
                        basics: {
                          ...basics,
                          links: basics.links.filter(
                            (item) => item.id !== link.id,
                          ),
                        },
                      },
                    })
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              disabled={basics.links.length >= 10}
              onClick={() =>
                change({
                  ...doc,
                  content: {
                    ...doc.content,
                    basics: {
                      ...basics,
                      links: [
                        ...basics.links,
                        { id: crypto.randomUUID(), label: "", url: "" },
                      ],
                    },
                  },
                })
              }
            >
              Thêm liên kết
            </Button>
          </section>
          <ResumeSections document={doc} onChange={change} />
        </fieldset>
        <Preview document={doc} resumeId={initial.id} />
      </div>
    </section>
  );
}
