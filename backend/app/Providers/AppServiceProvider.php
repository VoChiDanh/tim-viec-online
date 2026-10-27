<?php

namespace App\Providers;

use Carbon\Carbon;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Carbon::setLocale('vi');

        RateLimiter::for('email-resend', function (Request $request) {
            $email = $request->input('email');
            $account = is_string($email) ? hash('sha256', strtolower(trim($email))) : 'invalid';

            return [
                Limit::perMinute(1)->by('verification-minute:'.$account),
                Limit::perMinutes(15, 3)->by('verification-account:'.$account),
                Limit::perMinute(15)->by('verification-ip:'.$request->ip()),
            ];
        });
        RateLimiter::for('email-verify', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        RateLimiter::for('password-recovery', function (Request $request) {
            $email = $request->input('email');
            $account = is_string($email) ? hash('sha256', strtolower(trim($email))) : 'invalid';

            return [
                Limit::perMinutes(15, 3)->by('account:'.$account),
                Limit::perMinute(60)->by('ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('password-token', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
    }
}
