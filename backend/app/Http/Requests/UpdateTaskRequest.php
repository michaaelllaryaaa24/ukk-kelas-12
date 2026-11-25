<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormRequest: UpdateTaskRequest
 * ------------------------------
 * Memvalidasi operasi UPDATE tugas yang sudah ada (mendukung update penuh maupun parsial).
 */
class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'min:2', 'max:200'],
            'description' => ['sometimes', 'required', 'string', 'min:2', 'max:5000'],
            'status' => ['sometimes', 'in:todo,in_progress,completed'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'category' => ['sometimes', 'string', 'max:80'],
            'due_date' => ['nullable', 'date'],
            'is_pinned' => ['sometimes', 'boolean'],

            'subtasks' => ['sometimes', 'array', 'max:50'],
            'subtasks.*.id' => ['nullable', 'integer'],
            'subtasks.*.title' => ['required_with:subtasks', 'string', 'max:200'],
            'subtasks.*.is_completed' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul tugas tidak boleh kosong.',
            'title.min' => 'Judul tugas minimal terdiri dari 2 karakter.',
            'title.max' => 'Judul tugas maksimal 200 karakter.',
            'description.required' => 'Deskripsi tugas tidak boleh kosong.',
            'description.min' => 'Deskripsi tugas minimal terdiri dari 2 karakter.',
            'status.in' => 'Status tugas tidak valid.',
            'priority.in' => 'Prioritas tugas tidak valid.',
            'due_date.date' => 'Format tanggal tenggat waktu tidak valid.',
            'subtasks.*.title.required_with' => 'Judul item sub-tugas tidak boleh kosong.',
        ];
    }
}

