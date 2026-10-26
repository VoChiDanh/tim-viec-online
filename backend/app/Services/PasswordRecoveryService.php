<?php

namespace App\Services;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordRecoveryService
{
    public const EXPIRY_MINUTES = 15;

    public function sendLink(string $email): void
    {
        $user = User::where('email', strtolower($email))->first();
        if (! $user) {
            return;
        }

        $token = Str::random(64);
        $digest = hash('sha256', $token);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => $digest, 'created_at' => now()]
        );
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(
            ['token' => $token, 'email' => $user->email], '', '&', PHP_QUERY_RFC3986
        );

        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $url, $token));
        } catch (\Throwable $exception) {
            // Do not delete a newer request's token, or log transport bodies/credentials.
            DB::table('password_reset_tokens')->where('email', $user->email)->where('token', $digest)->delete();
            Log::error('Password reset email could not be sent', ['user_id' => $user->id]);
        }
    }

    public function isValid(string $email, string $token): bool
    {
        $record = DB::table('password_reset_tokens')->where('email', strtolower($email))->first();
        if (! $this->matches($record, $token)) {
            return false;
        }
        if ($this->expired($record)) {
            DB::table('password_reset_tokens')->where('email', $record->email)->where('token', $record->token)->delete();

            return false;
        }

        return true;
    }

    public function reset(string $email, string $token, string $password): ?User
    {
        $email = strtolower($email);

        return DB::transaction(function () use ($email, $token, $password) {
            $record = DB::table('password_reset_tokens')->where('email', $email)->lockForUpdate()->first();
            if (! $this->matches($record, $token)) {
                return null;
            }
            if ($this->expired($record)) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();

                return null;
            }
            $user = User::where('email', $email)->lockForUpdate()->first();
            if ($user) {
                $user->update(['password' => Hash::make($password), 'failed_attempts' => 0, 'locked_until' => null]);
                $user->tokens()->delete();
            }
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return $user;
        });
    }

    private function matches(?object $record, string $token): bool
    {
        return $record && hash_equals($record->token, hash('sha256', $token));
    }

    private function expired(object $record): bool
    {
        return Carbon::parse($record->created_at)->addMinutes(self::EXPIRY_MINUTES)->lessThanOrEqualTo(now());
    }
}
