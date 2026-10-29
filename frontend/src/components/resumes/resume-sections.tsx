"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ResumeDocument, SectionKey } from "@/features/resumes/schema";
import { SECTION_LABELS } from "@/features/resumes/templates";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";

const FIELDS: Record<SectionKey, Record<string, string>> = {
  experience: {
    company: "Công ty",
    position: "Vị trí",
    start_month: "Từ tháng",
    end_month: "Đến tháng",
    description: "Mô tả kinh nghiệm",
  },
  education: {
    school: "Trường",
    qualification: "Chuyên ngành / bằng cấp",
    start_month: "Từ tháng",
    end_month: "Đến tháng",
    description: "Thông tin học vấn",
  },
  skills: { name: "Tên kỹ năng", detail: "Mô tả kỹ năng" },
  projects: {
    name: "Tên dự án",
    role: "Vai trò",
    url: "Liên kết dự án",
    description: "Mô tả dự án",
  },
  certifications: {
    name: "Tên chứng chỉ",
    issuer: "Đơn vị cấp",
    issued_month: "Tháng cấp",
    url: "Liên kết chứng chỉ",
  },
  languages: { name: "Ngôn ngữ", proficiency: "Trình độ" },
  activities: {
    name: "Tên hoạt động",
    role: "Vai trò",
    description: "Mô tả hoạt động",
  },
};
export function ResumeSections({
  document: doc,
  onChange,
}: {
  document: ResumeDocument;
  onChange: (value: ResumeDocument) => void;
}) {
  function update(action: (next: ResumeDocument) => void) {
    const next = structuredClone(doc);
    action(next);
    onChange(next);
  }
  function move(section: SectionKey, index: number, direction: number) {
    update((next) => {
      const array = next.content[section];
      [array[index], array[index + direction]] = [
        array[index + direction],
        array[index],
      ];
    });
  }
  return (
    <>
      {doc.settings.section_order.map((section, order) => (
        <section className="resume-section-editor" key={section}>
          <header>
            <h2>{SECTION_LABELS[section]}</h2>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={order === 0}
                aria-label={`Đưa ${SECTION_LABELS[section]} lên`}
                onClick={() =>
                  update((next) => {
                    const list = next.settings.section_order;
                    [list[order - 1], list[order]] = [
                      list[order],
                      list[order - 1],
                    ];
                  })
                }
              >
                <ArrowUp size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={order === doc.settings.section_order.length - 1}
                aria-label={`Đưa ${SECTION_LABELS[section]} xuống`}
                onClick={() =>
                  update((next) => {
                    const list = next.settings.section_order;
                    [list[order + 1], list[order]] = [
                      list[order],
                      list[order + 1],
                    ];
                  })
                }
              >
                <ArrowDown size={16} />
              </Button>
            </div>
          </header>
          <label className="resume-check">
            <input
              type="checkbox"
              checked={!doc.settings.hidden_sections.includes(section)}
              onChange={(e) =>
                update((next) => {
                  next.settings.hidden_sections = e.target.checked
                    ? next.settings.hidden_sections.filter(
                        (key) => key !== section,
                      )
                    : [...next.settings.hidden_sections, section];
                })
              }
            />
            Hiện trong CV
          </label>
          {doc.content[section].map((entry, index) => (
            <fieldset key={entry.id} className="resume-entry">
              <legend>
                {SECTION_LABELS[section]} {index + 1}
              </legend>
              <div className="resume-entry-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Đưa mục ${index + 1} lên`}
                  disabled={index === 0}
                  onClick={() => move(section, index, -1)}
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Đưa mục ${index + 1} xuống`}
                  disabled={index === doc.content[section].length - 1}
                  onClick={() => move(section, index, 1)}
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xóa mục ${index + 1}`}
                  onClick={() =>
                    update((next) => {
                      next.content[section].splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              {Object.entries(FIELDS[section]).map(([key, label]) => {
                const record = entry as unknown as Record<
                  string,
                  string | null | boolean
                >;
                const isMonth = key.endsWith("month");
                const long = key === "description" || key === "detail";
                const max =
                  key === "description"
                    ? 2000
                    : key === "detail"
                      ? 500
                      : key === "url"
                        ? 1000
                        : ["skills", "languages"].includes(section)
                          ? 100
                          : 150;
                return (
                  <label key={key}>
                    {label}
                    {long ? (
                      <Textarea
                        rows={4}
                        value={String(record[key] ?? "")}
                        maxLength={max}
                        onChange={(e) =>
                          update((next) => {
                            (
                              next.content[section][index] as unknown as Record<
                                string,
                                unknown
                              >
                            )[key] = e.target.value;
                          })
                        }
                      />
                    ) : (
                      <Input
                        type={
                          isMonth ? "month" : key === "url" ? "url" : "text"
                        }
                        maxLength={max}
                        disabled={
                          key === "end_month" && record.current === true
                        }
                        value={String(record[key] ?? "")}
                        onChange={(e) =>
                          update((next) => {
                            (
                              next.content[section][index] as unknown as Record<
                                string,
                                unknown
                              >
                            )[key] = isMonth
                              ? e.target.value || null
                              : e.target.value;
                          })
                        }
                      />
                    )}
                  </label>
                );
              })}
              {"current" in entry && (
                <label className="resume-check">
                  <input
                    type="checkbox"
                    checked={entry.current}
                    onChange={(e) =>
                      update((next) => {
                        const item = next.content[section][index] as {
                          current: boolean;
                          end_month: string | null;
                        };
                        item.current = e.target.checked;
                        if (item.current) item.end_month = null;
                      })
                    }
                  />
                  Đang tiếp tục
                </label>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={doc.content[section].length >= 20}
            onClick={() =>
              update((next) => {
                const value: Record<string, unknown> = {
                  id: crypto.randomUUID(),
                };
                for (const key of Object.keys(FIELDS[section]))
                  value[key] = key.endsWith("month") ? null : "";
                if (section === "experience" || section === "education")
                  value.current = false;
                (next.content[section] as unknown[]).push(value);
              })
            }
          >
            <Plus size={16} />
            Thêm {SECTION_LABELS[section].toLocaleLowerCase("vi")}
          </Button>
        </section>
      ))}
    </>
  );
}
