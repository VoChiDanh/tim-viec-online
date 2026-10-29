<?php
namespace App\Http\Requests\Resumes;
class StoreResumeRequest extends ResumeRequest
{
    public function rules(): array { return ['name' => 'required|string|max:120', 'template_key' => 'required|in:classic,modern,minimal', 'prefill_from_profile' => 'sometimes|boolean']; }
    protected function prepareForValidation(): void { $this->rejectUnknown(['name', 'template_key', 'prefill_from_profile']); }
}
