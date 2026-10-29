<?php

namespace App\Http\Requests\Resumes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

abstract class ResumeRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isCandidate() ?? false; }
    protected function failedValidation(Validator $validator): void { throw new HttpResponseException(response()->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422)); }
    protected function rejectUnknown(array $allowed): void
    {
        $unknown = array_diff(array_keys($this->all()), $allowed);
        if ($unknown) throw \Illuminate\Validation\ValidationException::withMessages(['input' => 'Yêu cầu có trường không được hỗ trợ.']);
    }
}
