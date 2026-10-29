<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeApiTest extends TestCase
{
    use RefreshDatabase;
    private function document(): array { return json_decode(file_get_contents(base_path('../tests/fixtures/resumes/minimal.json')), true); }
    protected function setUp(): void { parent::setUp(); config(['resumes.enabled' => true]); }

    public function test_owner_can_create_prefill_save_and_duplicate_but_stale_revision_cannot_overwrite(): void
    {
        $user = User::factory()->create(['role' => 'candidate']);
        $created = $this->actingAs($user, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV của tôi', 'template_key' => 'classic', 'prefill_from_profile' => true])->assertCreated();
        $id = $created->json('data.id');
        $this->assertSame($user->name, $created->json('data.content.basics.full_name'));
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$this->document()])->assertOk()->assertJsonPath('data.revision', 2);
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$this->document()])->assertConflict();
        $this->postJson("/api/candidate/resumes/$id/duplicate", ['base_revision' => 2, 'name' => 'Bản sao'])->assertCreated()->assertJsonPath('data.revision', 1);
        $list = $this->getJson('/api/candidate/resumes')->assertOk()->assertJsonPath('meta.total', 2);
        $this->assertArrayNotHasKey('content', $list->json('data.0'));
        $this->deleteJson("/api/candidate/resumes/$id")->assertOk();
    }

    public function test_auth_roles_ownership_input_and_flag_are_enforced_at_backend(): void
    {
        $this->getJson('/api/candidate/resumes')->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'employer']), 'sanctum')->getJson('/api/candidate/resumes')->assertForbidden();
        $owner = User::factory()->create(['role' => 'candidate']);
        $id = $this->actingAs($owner, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->assertCreated()->json('data.id');
        $this->actingAs(User::factory()->create(['role' => 'candidate']), 'sanctum')->getJson("/api/candidate/resumes/$id")->assertNotFound();
        $this->deleteJson("/api/candidate/resumes/$id")->assertNotFound();
        $this->actingAs($owner, 'sanctum')->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic', 'candidate_id' => 999])->assertUnprocessable();
        $doc = $this->document(); $doc['content']['basics']['links'] = [['id' => (string) \Illuminate\Support\Str::uuid(), 'label' => 'Link', 'url' => 'file:///etc/passwd']];
        $this->putJson("/api/candidate/resumes/$id", ['base_revision' => 1, ...$doc])->assertUnprocessable();
        config(['resumes.enabled' => false]);
        $this->postJson('/api/candidate/resumes', ['name' => 'CV', 'template_key' => 'classic'])->assertStatus(503);
        $this->getJson("/api/candidate/resumes/$id")->assertOk();
        $this->deleteJson("/api/candidate/resumes/$id")->assertOk();
    }
}
