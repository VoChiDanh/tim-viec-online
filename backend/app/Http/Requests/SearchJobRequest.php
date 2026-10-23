<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class SearchJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'keyword' => 'nullable|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'city' => 'nullable|string|max:100',
            'job_type' => 'nullable|in:full_time,part_time,remote,internship',
            'salary_range' => 'nullable|in:under_10m,10m_20m,above_20m,negotiable,under_10,10_20,above_20',
            'skill_ids' => 'nullable|array',
            'skill_ids.*' => 'exists:skills,id',
            'per_page' => 'nullable|integer|min:1|max:50',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors(),
        ], 422));
    }
}
