<?php

namespace App\Services;

/**
 * GeminiAiService alias / wrapper for GeminiService
 */
class GeminiAiService extends GeminiService
{
    public function analyzeCvWithJob($cvFilePath, $jobDescription, $jobRequirements)
    {
        // Trích xuất text từ file PDF CV của ứng viên
        $cvText = $this->extractTextFromPdf($cvFilePath);

        $apiKey = config('services.gemini.key') ?: env('GEMINI_API_KEY');
        if (empty($apiKey) || $apiKey === 'dien_api_key_cua_ban_vao_day') {
            return null;
        }

        $prompt = <<<EOT
Bạn là hệ thống AI phân tích và chấm điểm tuyển dụng chuyên nghiệp. 
Hãy phân tích CV của ứng viên dựa trên Bản mô tả công việc (JD) và Yêu cầu chuyên môn sau đây:

--- MÔ TẢ CÔNG VIỆC (JD) ---
{$jobDescription}

--- YÊU CẦU CHUYÊN MÔN ---
{$jobRequirements}

--- NỘI DUNG CV ỨNG VIÊN ---
{$cvText}

--- YÊU CẦU ĐẦU RA (JSON FORMAT) ---
Hãy đánh giá dựa trên 4 tiêu chí: Kỹ năng chuyên môn (40%), Kinh nghiệm (30%), Học vấn/Chứng chỉ (15%), Ngoại ngữ/Định hướng (15%).
Trả về kết quả ĐÚNG định dạng JSON thuần túy theo cấu trúc mẫu sau (không kèm text ngoài):
{
  "match_score": 85,
  "summary": "Đoạn đánh giá tổng quan ngắn gọn dưới 80 từ về CV so với vị trí tuyển dụng",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "matched_skills": ["Kỹ năng khớp 1", "Kỹ năng khớp 2"],
  "missing_skills": ["Kỹ năng còn thiếu 1"],
  "recommendations": ["Lời khuyên cải thiện hồ sơ 1"]
}
EOT;

        try {
            $model = config('services.gemini.model', 'gemini-3.8-flash');
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
            $response = \Illuminate\Support\Facades\Http::withHeaders(['x-goog-api-key' => $apiKey])
                ->connectTimeout(5)
                ->timeout(25)
                ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ]);

            if ($response->successful()) {
                $raw = $response->json('candidates.0.content.parts.0.text');
                $clean = trim(str_replace(['```json', '```'], '', $raw));
                $decoded = json_decode($clean, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Gemini AI Exception: " . $e->getMessage());
        }

        return null;
    }
}
