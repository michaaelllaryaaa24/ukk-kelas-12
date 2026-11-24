<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource: SubtaskResource
 * -----------------------------
 * Memformat data sub-tugas (item checklist) sebelum dikirim ke Frontend React.
 */
class SubtaskResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'title' => $this->title,
            'is_completed' => (bool) $this->is_completed,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

