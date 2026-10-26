<?php

namespace App\Services;

use App\Models\AiCvAnalysis;
use App\Models\Application;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;

class GeminiService
{
    /**
     * Analyze a CV against its job description using the configured Gemini model.
     */
    public function analyze(Application $application): AiCvAnalysis
    {
        // Nếu đã có kết quả phân tích trước đó, trả về ngay (FR-07.5: lưu vĩnh viễn)
        if ($application->aiAnalysis) {
            return $application->aiAnalysis;
        }

        $application->job->load(['skills', 'company']);
        $cvText = $this->extractTextFromPdf($application->cv_path);

        $apiKey = config('services.gemini.key');
        if (! is_string($apiKey) || trim($apiKey) === '' || $apiKey === 'dien_api_key_cua_ban_vao_day') {
            throw new \RuntimeException('CV analysis provider is not configured.');
        }
        $result = $this->callGeminiApi($application, $apiKey, $cvText);
        $this->validateAnalysis($result);

        // The unique application_id constraint makes retries idempotent if workers race.
        return AiCvAnalysis::firstOrCreate(
            ['application_id' => $application->id],
            [
                'match_score' => $result['match_score'],
                'summary' => $result['summary'],
                'matched_skills' => $result['matched_skills'],
                'missing_skills' => $result['missing_skills'],
                'strengths' => $result['strengths'],
                'recommendations' => $result['recommendations'],
                'created_at' => now(),
            ]
        );
    }

    /**
     * Trích xuất văn bản từ tệp PDF (hỗ trợ cả đường dẫn tương đối trong storage và tuyệt đối)
     */
    public function extractTextFromPdf(string $filePath): string
    {
        $fullPath = file_exists($filePath) ? $filePath : null;
        if (! $fullPath) {
            foreach (['private', 'public'] as $disk) {
                if (Storage::disk($disk)->exists($filePath)) {
                    $fullPath = Storage::disk($disk)->path($filePath);
                    break;
                }
            }
        }
        if (! $fullPath || ! file_exists($fullPath)) {
            throw new \RuntimeException('CV file is missing.');
        }

        try {
            $parser = new Parser;
            $pdf = $parser->parseFile($fullPath);
            $text = trim((string) $pdf->getText());
            if (mb_strlen($text) < 20) {
                throw new \RuntimeException('Unreadable CV text.');
            }

            return $text;
        } catch (\Throwable $e) {
            Log::warning('CV PDF could not be read', ['exception_type' => $e::class]);
            throw new \RuntimeException('Unreadable CV text.', 0, $e);
        }
    }

    /**
     * Send the inline PDF and job requirements to the configured Gemini model.
     */
    protected function callGeminiApi(Application $application, string $apiKey, string $pdfText): array
    {
        $job = $application->job;

        $pdfRelativePath = $application->cv_path;
        $disk = Storage::disk('private')->exists($pdfRelativePath) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($pdfRelativePath)) {
            throw new \RuntimeException('CV file is missing.');
        }

        $pdfBytes = Storage::disk($disk)->get($pdfRelativePath);
        $base64Pdf = base64_encode($pdfBytes);

        $jobSkillsStr = $job->skills->pluck('name')->implode(', ');

        $prompt = <<<EOT
Bạn là chuyên gia nhân sự và tuyển dụng cấp cao. Hãy phân tích CV của ứng viên và đối chiếu với bản mô tả công việc (JD) sau đây:

--- THÔNG TIN VỊ TRÍ TUYỂN DỤNG ---
- Tiêu đề công việc: {$job->title}
- Cấp bậc: {$job->job_level}
- Kỹ năng yêu cầu: {$jobSkillsStr}
- Mô tả công việc (JD): {$job->description}
- Yêu cầu chuyên môn: {$job->requirements}

--- NỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ CV ---
{$pdfText}

--- TIÊU CHÍ ĐÁNH GIÁ (SRS FR-07.2) ---
1. Kỹ năng chuyên môn (Trọng số 40%): Độ khớp giữa kỹ năng CV có và JD đòi hỏi.
2. Kinh nghiệm làm việc (Trọng số 30%): Số năm kinh nghiệm và vị trí tương đương.
3. Học vấn & Chứng chỉ (Trọng số 15%).
4. Định hướng & Trình độ ngoại ngữ (Trọng số 15%).

HÃY PHẢN HỒI DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ THEO ĐÚNG CẤU TRÚC SAU (không kèm markdown ngoài):
{
  "match_score": 85,
  "summary": "Đoạn văn ngắn gọn dưới 80 từ nhận xét mức độ phù hợp tổng quan",
  "matched_skills": ["Kỹ năng 1", "Kỹ năng 2"],
  "missing_skills": ["Kỹ năng còn thiếu 1", "Kỹ năng còn thiếu 2"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "recommendations": ["Lời khuyên cải thiện 1", "Lời khuyên cải thiện 2"]
}
EOT;

        $model = config('services.gemini.model');
        if (! is_string($model) || ! preg_match('/^[a-zA-Z0-9._-]+$/', $model)) {
            throw new \RuntimeException('CV analysis model is not configured.');
        }
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
            ->connectTimeout(5)
            ->timeout(25)
            ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'inlineData' => [
                                    'mimeType' => 'application/pdf',
                                    'data' => $base64Pdf,
                                ],
                            ],
                            [
                                'text' => $prompt,
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'responseSchema' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'match_score' => ['type' => 'INTEGER', 'minimum' => 0, 'maximum' => 100],
                            'summary' => ['type' => 'STRING'],
                            'matched_skills' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                            'missing_skills' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING'], 'maxItems' => 4],
                            'strengths' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING'], 'minItems' => 2, 'maxItems' => 4],
                            'recommendations' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                        ],
                        'required' => ['match_score', 'summary', 'matched_skills', 'missing_skills', 'strengths', 'recommendations'],
                    ],
                    'temperature' => 0.2,
                ],
            ]);

        $response->throw();
        $rawText = $response->json('candidates.0.content.parts.0.text');
        if (! is_string($rawText)) {
            throw new \RuntimeException('CV analysis provider returned no assessment.');
        }
        $result = json_decode($rawText, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($result)) {
            throw new \RuntimeException('Invalid CV assessment.');
        }

        return $result;
    }

    private function validateAnalysis(array $result): void
    {
        $wordCount = is_string($result['summary'] ?? null)
            ? preg_match_all('/[\p{L}\p{N}]+(?:[-+][\p{L}\p{N}]+)*/u', $result['summary'])
            : 0;
        if (! isset($result['match_score']) || ! is_int($result['match_score'])
            || $result['match_score'] < 0 || $result['match_score'] > 100
            || ! isset($result['summary']) || ! is_string($result['summary'])
            || trim($result['summary']) === '' || $wordCount >= 80) {
            throw new \RuntimeException('Invalid CV assessment.');
        }
        foreach (['matched_skills', 'missing_skills', 'strengths', 'recommendations'] as $field) {
            if (! isset($result[$field]) || ! is_array($result[$field]) || ! array_is_list($result[$field])) {
                throw new \RuntimeException('Invalid CV assessment.');
            }
            foreach ($result[$field] as $value) {
                if (! is_string($value) || trim($value) === '') {
                    throw new \RuntimeException('Invalid CV assessment.');
                }
            }
        }
        if (count($result['strengths']) < 2 || count($result['strengths']) > 4
            || count($result['missing_skills']) > 4) {
            throw new \RuntimeException('Invalid CV assessment.');
        }
    }
}
