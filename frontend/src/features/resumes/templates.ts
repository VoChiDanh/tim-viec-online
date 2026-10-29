export const RESUME_TEMPLATES = [
  {
    key: "classic",
    version: 1,
    label: "Chuyên nghiệp",
    description:
      "Một cột mạch lạc, mốc thời gian rõ ràng. Phù hợp hồ sơ chuyên môn và quản lý.",
  },
  {
    key: "modern",
    version: 1,
    label: "Hiện đại",
    description:
      "Tiêu đề xanh đậm, hai cột cân đối. Làm nổi bật kỹ năng và kinh nghiệm của bạn.",
  },
  {
    key: "minimal",
    version: 1,
    label: "Tối giản",
    description:
      "Chữ thanh lịch, đường nét tinh gọn. Tập trung vào thành tích và dễ đọc khi in.",
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
