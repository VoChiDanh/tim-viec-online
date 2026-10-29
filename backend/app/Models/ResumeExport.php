<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeExport extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['path', 'input_snapshot', 'attempt_token'];
    protected function casts(): array { return ['input_snapshot' => 'array', 'revision' => 'integer', 'started_at' => 'datetime', 'completed_at' => 'datetime']; }
    public function resume(): BelongsTo { return $this->belongsTo(Resume::class); }
}
