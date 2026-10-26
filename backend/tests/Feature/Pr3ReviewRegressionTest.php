<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeApplicationCv;
use App\Models\AiCvAnalysis;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Maintainer regression probes for exact PR #3 head; expected to fail until fixed. */
class Pr3ReviewRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['broadcasting.default' => 'log', 'services.gemini.key' => null]);
        Storage::fake('private');
        Storage::fake('public');
        Mail::fake();
        Http::preventStrayRequests();
        Bus::fake();
    }

    protected function beforeRefreshingDatabase(): void
    {
        // RefreshDatabase invokes this hook before migrations can reset tables.
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('pr3_review_test', config('database.connections.mysql.database'));
        $this->assertSame('33063', (string) config('database.connections.mysql.port'));
    }

    public function test_recovery_response_cannot_replace_password_without_mailbox_access(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPass1!')]);
        $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);
        $response->assertOk();
        $token = $response->json('data.token');
        if (is_string($token) && $token !== '') {
            $this->postJson('/api/reset-password', [
                'email' => $user->email,
                'token' => $token,
                'password' => 'ChangedPass2!',
                'password_confirmation' => 'ChangedPass2!',
            ])->assertOk();
        }
        // Never print recovery tokens or response bodies in review evidence.
        $this->assertTrue(Hash::check('OriginalPass1!', $user->fresh()->password),
            'Public recovery response allowed password replacement without mailbox access.');
    }

    public function test_candidate_cannot_read_or_trigger_employer_ai_assessment(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->analysis($application);
        $this->actingAs($candidate, 'sanctum');
        $statuses = [
            $this->getJson("/api/applications/{$application->id}/ai-analysis")->status(),
            $this->postJson("/api/applications/{$application->id}/ai-analyze")->status(),
        ];
        $this->assertSame([403, 403], $statuses);
    }

    public function test_candidate_history_omits_employer_ai_assessment(): void
    {
        [$candidate, , $application] = $this->fixture();
        $this->analysis($application);
        $response = $this->actingAs($candidate, 'sanctum')->getJson('/api/candidate/applications');
        $response->assertOk();
        $this->assertFalse(array_key_exists('ai_analysis', $response->json('data.0')),
            'Candidate history includes employer-only assessment.');
    }

    public function test_removing_profile_cv_preserves_original_submitted_cv(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')->deleteJson('/api/candidate/cv')->assertOk();
        $this->actingAs($employer, 'sanctum')
            ->get("/api/applications/{$application->id}/cv")->assertOk();
    }

    public function test_apply_dispatches_ai_asynchronously(): void
    {
        $this->fixture();
        Bus::assertNotDispatchedSync(AnalyzeApplicationCv::class);
        Bus::assertDispatched(AnalyzeApplicationCv::class);
    }

    public function test_direct_employer_cv_view_marks_application_reviewed(): void
    {
        [, $employer, $application] = $this->fixture();
        $this->actingAs($employer, 'sanctum')
            ->get("/api/applications/{$application->id}/cv")->assertOk();
        $this->assertSame('waiting', $application->fresh()->status);
        $this->assertNotNull($application->fresh()->reviewed_at);
    }

    public function test_employer_cannot_resurrect_withdrawn_application(): void
    {
        [$candidate, $employer, $application] = $this->fixture();
        $this->actingAs($candidate, 'sanctum')
            ->deleteJson("/api/candidate/applications/{$application->id}/withdraw")->assertOk();
        $this->actingAs($employer, 'sanctum')
            ->patchJson("/api/employer/applications/{$application->id}/status", ['status' => 'accepted']);
        $this->assertSame('withdrawn', $application->fresh()->status);
    }

    public function test_unreadable_cv_does_not_produce_successful_assessment(): void
    {
        [, , $application] = $this->fixture();
        // The fixture's fake PDF has no readable text and HTTP is disabled.
        try {
            (new AnalyzeApplicationCv($application->id))->handle(app(GeminiService::class));
        } catch (\Throwable) {
            // A validation failure is expected; the persisted status is the contract.
        }
        $this->assertSame('failed', $application->fresh()->ai_analysis_status);
        $this->assertNull($application->fresh()->aiAnalysis);
    }

    private function fixture(): array
    {
        $candidate = User::factory()->create(['role' => 'candidate', 'status' => 'active']);
        $profile = CandidateProfile::create(['user_id' => $candidate->id, 'cv_file_path' => 'cvs/original.pdf']);
        Storage::disk('private')->put($profile->cv_file_path, '%PDF-1.4 review fixture without readable text');
        $employer = User::factory()->create(['role' => 'employer', 'status' => 'active']);
        $company = Company::create([
            'user_id' => $employer->id, 'name' => 'Review Company',
            'description' => 'Review fixture company', 'address' => 'Review address', 'city' => 'Ha Noi',
        ]);
        $category = Category::create(['name' => 'Review category']);
        $job = Job::create([
            'company_id' => $company->id, 'category_id' => $category->id,
            'title' => 'Backend developer review', 'job_level' => 'mid', 'quantity' => 1,
            'description' => 'Build software', 'requirements' => 'PHP', 'benefits' => 'Benefits',
            'salary_min' => 10000000, 'salary_max' => 20000000, 'is_negotiable' => false,
            'job_type' => 'full_time', 'city' => 'Ha Noi', 'address' => 'Review address',
            'deadline' => now()->addDays(14)->toDateString(), 'status' => 'active',
        ]);
        $response = $this->actingAs($candidate, 'sanctum')
            ->postJson("/api/jobs/{$job->id}/apply", ['cv_source' => 'profile']);
        $response->assertCreated();

        return [$candidate, $employer, Application::findOrFail($response->json('data.id'))];
    }

    private function analysis(Application $application): void
    {
        AiCvAnalysis::create([
            'application_id' => $application->id, 'match_score' => 88,
            'summary' => 'Review fixture assessment', 'matched_skills' => ['PHP'],
            'missing_skills' => ['Redis'], 'strengths' => ['PHP', 'SQL'], 'recommendations' => [],
        ]);
        $application->update(['ai_analysis_status' => 'completed']);
    }
}
