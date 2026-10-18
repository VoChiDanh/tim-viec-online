<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Mail\ResetPasswordMail;
use App\Models\CandidateProfile;
use App\Models\Company;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Đăng ký tài khoản mới (FR-01)
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => strtolower($request->email),
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'dob' => $request->dob,
                'role' => $request->role,
                'status' => 'active',
                'failed_attempts' => 0,
            ]);

            // FR-01.6: Tự động tạo hồ sơ tương ứng
            if ($user->isCandidate()) {
                CandidateProfile::create([
                    'user_id' => $user->id,
                ]);
                $user->load('candidateProfile');
            } elseif ($user->isEmployer()) {
                Company::create([
                    'user_id' => $user->id,
                    'name' => $user->name,
                ]);
                $user->load('company');
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Đăng ký tài khoản thành công',
                'data' => [
                    'token' => $token,
                    'token_type' => 'Bearer',
                    'user' => $user,
                ],
            ], 201);
        });
    }

    /**
     * Đăng nhập tài khoản (FR-02)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', strtolower($request->email))->first();

        // FR-02.2: Kiểm tra user có tồn tại
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
            ], 401);
        }

        // FR-02.5: Kiểm tra tài khoản bị Admin khóa
        if ($user->status === 'locked') {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa bởi quản trị viên',
            ], 403);
        }

        // Kiểm tra nếu thời gian khóa tạm thời đã hết thì đặt lại bộ đếm
        if ($user->locked_until && $user->locked_until->isPast()) {
            $user->update([
                'failed_attempts' => 0,
                'locked_until' => null,
            ]);
        }

        // FR-02.4: Kiểm tra tài khoản bị tạm khóa do nhập sai nhiều lần
        if ($user->locked_until && $user->locked_until->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản',
            ], 403);
        }

        // Kiểm tra mật khẩu
        if (!Hash::check($request->password, $user->password)) {
            $user->increment('failed_attempts');

            // FR-02.3 & FR-02.4: Sau 5 lần đăng nhập sai liên tiếp, tạm khóa 15 phút
            if ($user->failed_attempts >= 5) {
                $user->update([
                    'locked_until' => now()->addMinutes(15),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản',
                ], 403);
            }

            // FR-02.2: Hiển thị thông báo nếu email hoặc mật khẩu không chính xác
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
            ], 401);
        }

        // Đăng nhập đúng: đặt lại bộ đếm số lần sai về 0 và xóa khóa tạm thời
        $user->update([
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        if ($user->isCandidate()) {
            $user->load(['candidateProfile.skills']);
        } elseif ($user->isEmployer()) {
            $user->load('company');
        }

        // FR-02.6: Cấp phát token & tự động điều hướng theo vai trò
        $token = $user->createToken('auth_token')->plainTextToken;

        $redirectUrl = match ($user->role) {
            'candidate' => '/jobs',
            'employer' => '/employer/my-jobs',
            'admin' => '/admin/dashboard',
            default => '/',
        };

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
                'redirect_url' => $redirectUrl,
            ],
        ], 200);
    }

    /**
     * Yêu cầu quên mật khẩu (FR-02.7)
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email không tồn tại trong hệ thống',
            ], 404);
        }

        // Tạo mã token ngẫu nhiên bảo mật
        $token = Str::random(64);

        // Lưu vào bảng password_reset_tokens với hiệu lực 15 phút
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => $token,
                'created_at' => now(),
            ]
        );

        // Tạo liên kết đặt lại mật khẩu gửi về email
        $frontendUrl = config('app.frontend_url') ?: env('FRONTEND_URL', 'http://localhost:3000');
        $resetUrl = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $resetUrl, $token));
        } catch (\Throwable $e) {
            Log::error('Gửi email đặt lại mật khẩu thất bại: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn',
            'data' => [
                'email' => $user->email,
                'token' => $token,
                'reset_url' => $resetUrl,
                'expires_in_minutes' => 15,
            ],
        ], 200);
    }

    /**
     * Kiểm tra tính hợp lệ của liên kết đặt lại mật khẩu (FR-02.8)
     */
    public function verifyResetToken(Request $request): JsonResponse
    {
        $email = $request->query('email') ?? $request->input('email');
        $token = $request->query('token') ?? $request->input('token');

        if (!$email || !$token) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', strtolower($email))
            ->first();

        if (!$record || $record->token !== $token) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        // Kiểm tra hiệu lực trong 15 phút (FR-02.7 & FR-02.8)
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(15)->isPast()) {
            DB::table('password_reset_tokens')->where('email', strtolower($email))->delete();

            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Liên kết xác thực hợp lệ',
            'data' => [
                'email' => $record->email,
                'token' => $record->token,
            ],
        ], 200);
    }

    /**
     * Đặt lại mật khẩu mới (FR-02.8)
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $email = strtolower($request->email);

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        // Kiểm tra token và hạn 15 phút
        if (!$record || $record->token !== $request->token) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(15)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return response()->json([
                'success' => false,
                'message' => 'Liên kết xác thực đã hết hạn hoặc không hợp lệ',
            ], 400);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email không tồn tại trong hệ thống',
            ], 404);
        }

        $newPassword = $request->password ?? $request->new_password;

        // Cập nhật mật khẩu mới và mở khóa tài khoản (reset số lần sai)
        $user->update([
            'password' => Hash::make($newPassword),
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        // Xóa token đã sử dụng
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // Tạo thông báo bảo mật
        Notification::create([
            'user_id' => $user->id,
            'title' => 'Đặt lại mật khẩu thành công',
            'content' => 'Mật khẩu tài khoản của bạn đã được đặt lại thành công vào lúc ' . now()->format('H:i d/m/Y') . '.',
            'type' => 'security',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công',
            'data' => [
                'redirect_url' => '/login',
            ],
        ], 200);
    }

    /**
     * Lấy thông tin user hiện tại kèm profile
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isCandidate()) {
            $user->load(['candidateProfile.skills']);
        } elseif ($user->isEmployer()) {
            $user->load('company');
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ], 200);
    }

    /**
     * Đăng xuất & Thu hồi token
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đăng xuất thành công',
        ], 200);
    }

    /**
     * Đổi mật khẩu khi đang đăng nhập (FR-02.9)
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        // Kiểm tra mật khẩu hiện tại
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không chính xác',
            ], 400);
        }

        $newPassword = $request->new_password ?? $request->password;

        // Kiểm tra mật khẩu mới trùng với mật khẩu cũ
        if (Hash::check($newPassword, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($newPassword),
            'failed_attempts' => 0,
            'locked_until' => null,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Đổi mật khẩu thành công',
            'content' => 'Mật khẩu của bạn đã được cập nhật thành công vào lúc ' . now()->format('H:i d/m/Y') . '.',
            'type' => 'security',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công',
        ], 200);
    }
}
