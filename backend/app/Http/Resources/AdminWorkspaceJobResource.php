<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Company and category catalogs are sent once, not repeated for every job. */
class AdminWorkspaceJobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'company_id', 'category_id', 'title', 'job_level', 'quantity',
                'salary_min', 'salary_max', 'is_negotiable', 'job_type', 'city',
                'address', 'status', 'is_reported', 'description', 'requirements',
                'benefits', 'applications_count',
            ]),
            'deadline' => $this->deadline?->format('Y-m-d'),
            'is_expired' => $this->deadline && $this->deadline->toDateString() < now()->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'skills' => $this->skills->map(fn ($skill) => ['id' => $skill->id, 'name' => $skill->name])->all(),
        ];
    }
}
