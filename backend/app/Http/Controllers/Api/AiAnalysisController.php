<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAnalysisController extends Controller
{
    /**
     * Kích hoạt AI phân tích CV ứng viên so với JD công việc (FR-07)
     */
    public function analyzeAndStore(Request $request, $applicationId, GeminiService $geminiService): JsonResponse
    {
        $user = $request->user();

        // 1. Tìm đơn ứng tuyển kèm thông tin tin tuyển dụng và hồ sơ ứng viên
        $application = Application::with(['job.company', 'candidateProfile.user', 'aiAnalysis'])->find($applicationId);
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // 2. Phân quyền: Nhà tuyển dụng sở hữu tin, Admin hoặc chính ứng viên nộp đơn mới được phân tích
        $isOwnerCandidate = $user->role === 'candidate' && $application->candidateProfile && $application->candidateProfile->user_id === $user->id;
        $isOwnerEmployer = $user->role === 'employer' && $application->job && $application->job->company && $application->job->company->user_id === $user->id;
        $isAdmin = $user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện phân tích AI cho đơn ứng tuyển này.'
            ], 403);
        }

        // 3. Kiểm tra file CV có tồn tại không
        if (!$application->cv_path) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn ứng tuyển này chưa có file CV để phân tích.'
            ], 400);
        }

        try {
            // 4. Gọi GeminiService phân tích (đã tích hợp trích xuất PDF và thuật toán dự phòng)
            $analysis = $geminiService->analyze($application);

            return response()->json([
                'success' => true,
                'message' => 'AI phân tích CV và lưu kết quả thành công!',
                'data' => $analysis
            ], 200, [], JSON_UNESCAPED_UNICODE);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Quá trình phân tích AI gặp sự cố.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xem kết quả phân tích AI đã lưu của một đơn ứng tuyển
     */
    public function show(Request $request, $applicationId): JsonResponse
    {
        $user = $request->user();

        // Tìm đơn ứng tuyển
        $application = Application::with(['job.company', 'candidateProfile.user', 'aiAnalysis'])->find($applicationId);

        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ ứng tuyển.'
            ], 404);
        }

        // Kiểm tra quyền
        $isOwnerCandidate = $user->role === 'candidate' && $application->candidateProfile && $application->candidateProfile->user_id === $user->id;
        $isOwnerEmployer = $user->role === 'employer' && $application->job && $application->job->company && $application->job->company->user_id === $user->id;
        $isAdmin = $user->role === 'admin';

        if (!$isOwnerCandidate && !$isOwnerEmployer && !$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem kết quả phân tích AI của đơn này.'
            ], 403);
        }

        $analysis = $application->aiAnalysis;

        if (!$analysis) {
            return response()->json([
                'success' => false,
                'message' => 'Hồ sơ này chưa được AI phân tích hoặc đang trong quá trình xử lý.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy kết quả phân tích AI thành công.',
            'data' => [
                'application_id' => $application->id,
                'job_title' => $application->job?->title,
                'candidate_name' => $application->candidateProfile?->user?->name,
                'match_score' => $analysis->match_score,
                'summary' => $analysis->summary,
                'strengths' => $analysis->strengths,
                'matched_skills' => $analysis->matched_skills,
                'missing_skills' => $analysis->missing_skills,
                'recommendations' => $analysis->recommendations,
                'analyzed_at' => $analysis->created_at,
            ]
        ], 200);
    }
}
