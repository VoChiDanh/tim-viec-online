"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FilePlus2, Copy, Trash2, ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/features/api/client";
import { fetchResumes, resumeFileUrl } from "@/features/resumes/client";
import { RESUME_TEMPLATES } from "@/features/resumes/templates";
import type { ResumeDetail, ResumeList } from "@/features/resumes/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Pagination } from "@/components/layout/pagination";

export function ResumeLibrary({
  connected,
  create = false,
}: {
  connected: boolean;
  create?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<ResumeList | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("CV của tôi");
  const [selected, setSelected] = useState("classic");
  const [prefill, setPrefill] = useState(true);
  useEffect(() => {
    if (!connected) return;
    let active = true;
    fetchResumes(page)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [connected, page]);
  async function make() {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<ResumeDetail>("/candidate/resumes", {
        method: "POST",
        body: JSON.stringify({
          name,
          template_key: selected,
          prefill_from_profile: prefill,
        }),
      });
      router.push(`/account/resumes/${response.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function remove(id: number) {
    if (
      !window.confirm(
        "Xóa bản nháp CV này? Hồ sơ đã ứng tuyển vẫn được giữ nguyên.",
      )
    )
      return;
    setBusy(true);
    try {
      await apiRequest(`/candidate/resumes/${id}`, { method: "DELETE" });
      const updated = await fetchResumes(page);
      setData(updated);
      setPage(updated.meta.current_page);
      toast.success("Đã xóa CV.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function duplicate(id: number, revision: number, title: string) {
    setBusy(true);
    try {
      const response = await apiRequest<ResumeDetail>(
        `/candidate/resumes/${id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `${title.slice(0, 105)} (bản sao)`,
            base_revision: revision,
          }),
        },
      );
      router.push(`/account/resumes/${response.data.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="resume-library">
      <header className="resume-page-heading">
        <div>
          <p className="resume-eyebrow">HỒ SƠ NGHỀ NGHIỆP</p>
          <h1>{create ? "Bắt đầu CV của bạn" : "CV của tôi"}</h1>
          <p>
            {create
              ? "Chọn bố cục phù hợp. Bạn có thể đổi mẫu trong lúc chỉnh sửa."
              : "Chuẩn bị từng bản CV cho công việc bạn muốn ứng tuyển."}
          </p>
        </div>
        {!create && connected && (
          <Button asChild disabled={!data?.meta.enabled}>
            <Link href="/account/resumes/new">
              <FilePlus2 size={18} /> Tạo CV mới
            </Link>
          </Button>
        )}
        {create && (
          <Button asChild variant="outline">
            <Link href="/account/resumes">CV của tôi</Link>
          </Button>
        )}
      </header>
      {!connected && (
        <p role="status" className="resume-notice">
          Trình tạo CV cần kết nối backend. Vui lòng bật chế độ API để lưu CV
          vào tài khoản.
        </p>
      )}
      {error && (
        <p className="resume-error" role="alert">
          {error}
        </p>
      )}
      {connected && !data && !error && (
        <div
          className="resume-skeleton"
          aria-label="Đang tải CV"
          aria-busy="true"
        >
          <div />
          <div />
          <div />
        </div>
      )}
      {data && !data.meta.enabled && (
        <p className="resume-notice">
          Trình tạo CV đang được bảo trì. Bạn vẫn có thể mở và tải những CV đã
          lưu.
        </p>
      )}
      {create ? (
        <>
          <div className="resume-create-fields">
            <label>
              Tên CV
              <Input
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="resume-check">
              <input
                type="checkbox"
                checked={prefill}
                onChange={(e) => setPrefill(e.target.checked)}
              />
              Điền thông tin từ hồ sơ cá nhân
            </label>
          </div>
          <div
            className="resume-template-grid"
            role="radiogroup"
            aria-label="Mẫu CV"
          >
            {RESUME_TEMPLATES.map((template) => (
              <label
                key={template.key}
                className="resume-template"
                data-selected={selected === template.key}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.key}
                  checked={selected === template.key}
                  onChange={() => setSelected(template.key)}
                />
                <div className="resume-template-art">
                  <Image
                    src={`/resume-templates/${template.key}.png`}
                    alt={`Bố cục mẫu ${template.label}`}
                    width={300}
                    height={420}
                  />
                </div>
                <strong>{template.label}</strong>
                <span>{template.description}</span>
              </label>
            ))}
          </div>
          <div className="resume-create-action">
            <Button
              disabled={
                busy || !connected || !data?.meta.enabled || !name.trim()
              }
              onClick={make}
            >
              {busy ? "Đang tạo…" : "Sử dụng mẫu này"}
              <ArrowRight size={18} />
            </Button>
          </div>
        </>
      ) : (
        <>
          {data?.items.length === 0 && (
            <div className="resume-empty">
              <FileText size={42} />
              <h2>CV đầu tiên bắt đầu từ đây</h2>
              <p>
                Chọn một mẫu, thêm kinh nghiệm và tạo bản PDF của riêng bạn.
              </p>
              <Button asChild>
                <Link href="/account/resumes/new">Tạo CV đầu tiên</Link>
              </Button>
            </div>
          )}
          <div className="resume-document-grid">
            {data?.items.map((item) => (
              <article className="resume-document-card" key={item.id}>
                <Link
                  className="resume-document-cover"
                  href={`/account/resumes/${item.id}/edit`}
                >
                  <Image
                    src={`/resume-templates/${item.template_key}.png`}
                    alt=""
                    width={220}
                    height={310}
                  />
                </Link>
                <div className="resume-document-info">
                  <h2>
                    <Link href={`/account/resumes/${item.id}/edit`}>
                      {item.name}
                    </Link>
                  </h2>
                  <p>
                    Phiên bản {item.revision} ·{" "}
                    {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                  </p>
                  <div className="resume-card-actions">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/account/resumes/${item.id}/edit`}>
                        Chỉnh sửa
                      </Link>
                    </Button>
                    {item.latest_export?.file_url && (
                      <a
                        href={resumeFileUrl(item.latest_export.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        PDF v{item.latest_export.revision}
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy || !data.meta.enabled}
                      onClick={() =>
                        duplicate(item.id, item.revision, item.name)
                      }
                      aria-label={`Sao chép ${item.name}`}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      onClick={() => remove(item.id)}
                      aria-label={`Xóa ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {data && (
            <Pagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              onPageChange={(next) => {
                setPage(next);
                setData(null);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
