export const RESUME_TEMPLATES = [
  {
    key: "classic",
    version: 1,
    label: "Chuyên nghiệp",
    description: "Một cột rõ ràng, phù hợp mọi ngành nghề.",
  },
  {
    key: "modern",
    version: 1,
    label: "Hiện đại",
    description: "Thông tin liên hệ và kỹ năng ở cột bên.",
  },
  {
    key: "minimal",
    version: 1,
    label: "Tối giản",
    description: "Ít trang trí, tập trung vào nội dung.",
  },
] as const;
export const SECTION_LABELS = {
  experience: "Kinh nghiệm làm việc",
  education: "Học vấn",
  skills: "Kỹ năng",
  projects: "Dự án",
  certifications: "Chứng chỉ",
  languages: "Ngoại ngữ",
  activities: "Hoạt động",
} as const;
