<?php
namespace Tests\Feature;
use App\Jobs\RenderResumePdf;
use App\Models\User;
use App\Models\Resume;
use App\Models\ResumeExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeExportTest extends TestCase
{
    use RefreshDatabase;
    public function test_export_snapshot_deduplicates_jobs_and_never_changes_on_later_edits(): void
    {
        config(['resumes.enabled' => true]); Queue::fake();
        $user = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->json('data.id');
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertOk();
        $first = $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertStatus(202)->json('data');
        $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertStatus(202)->assertJsonPath('data.id', $first['id']);
        Queue::assertPushed(RenderResumePdf::class, 1);
        $doc['name'] = 'CV sửa sau';
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 2, ...$doc])->assertOk();
        $this->assertSame('CV tổng hợp kiểm thử', ResumeExport::find($first['id'])->input_snapshot['name']);
        $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->assertConflict();
        $this->getJson("/api/candidate/resume-exports/{$first['id']}/file")->assertConflict();
        $this->actingAs(User::factory()->create(['role' => 'candidate']), 'sanctum')->getJson("/api/candidate/resume-exports/{$first['id']}")->assertNotFound();
    }

    public function test_real_node_renderer_publishes_private_text_pdf_and_stale_job_cannot_overwrite(): void
    {
        config(['resumes.enabled' => true]); Storage::fake('private'); Queue::fake();
        $user = User::factory()->create(['role' => 'candidate']);
        $this->actingAs($user, 'sanctum');
        $id = $this->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->json('data.id');
        $doc = json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertOk();
        $exportId = $this->postJson("/api/candidate/resumes/$id/exports", ['revision' => 2])->json('data.id');
        $export = ResumeExport::findOrFail($exportId);
        $job = new RenderResumePdf($export->id, $export->attempt_token);
        $job->handle(app(\App\Services\Resumes\ResumePdfRenderer::class));
        $export->refresh(); $this->assertSame('ready', $export->status);
        $this->assertGreaterThan(1000, $export->size);
        $hash = $export->sha256;
        (new RenderResumePdf($export->id, 'old-token'))->handle(app(\App\Services\Resumes\ResumePdfRenderer::class));
        $this->assertSame($hash, $export->fresh()->sha256);
        $pdf = (new \Smalot\PdfParser\Parser)->parseContent(Storage::disk('private')->get($export->path));
        $this->assertStringContainsString('Nguyễn Minh An', $pdf->getText());
        $this->get("/api/candidate/resume-exports/$exportId/file")->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }
}
