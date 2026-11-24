<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource: TaskResource
 * --------------------------
 * Menstandarkan format respons JSON untuk entitas Task beserta relasi Subtasks dan statistik checklist.
 */
class TaskResource extends JsonResource
{
    /**
     * Mengonversi model Task menjadi Associative Array terstruktur untuk API.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subtasksLoaded = $this->relationLoaded('subtasks') ? $this->subtasks : collect();
        $totalSubtasks = $subtasksLoaded->count();
        $completedSubtasks = $subtasksLoaded->where('is_completed', true)->count();

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'category' => $this->category,
            'due_date' => $this->due_date ? $this->due_date->format('Y-m-d') : null,
            'is_pinned' => (bool) $this->is_pinned,
            'is_overdue' => $this->is_overdue,
            // Relasi hasMany subtasks diformat menjadi Array of Objects menggunakan SubtaskResource
            'subtasks' => SubtaskResource::collection($this->whenLoaded('subtasks')),
            'subtask_stats' => [
                'total' => $totalSubtasks,
                'completed' => $completedSubtasks,
                'percentage' => $totalSubtasks > 0 ? (int) round(($completedSubtasks / $totalSubtasks) * 100) : 0,
            ],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

