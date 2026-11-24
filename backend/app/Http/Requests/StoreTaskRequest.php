<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormRequest: StoreTaskRequest
 * -----------------------------
 * Kelas validasi terpisah untuk operasi CREATE (pembuatan tugas baru beserta daftar sub-tugas).
 * Memisahkan validasi dari Controller menjaga arsitektur Laravel tetap bersih dan terstruktur.
 */
class StoreTaskRequest extends FormRequest
{
    /**
     * Mengizinkan pengguna yang sudah terautentikasi untuk membuat tugas baru.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Associative Array berisi aturan validasi untuk setiap field input tugas.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'in:todo,in_progress,completed'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'category' => ['nullable', 'string', 'max:80'],
            'due_date' => ['nullable', 'date'],
            'is_pinned' => ['nullable', 'boolean'],

            // Validasi Multidimensional Array / Array of Objects untuk Sub-tugas (Checklist)
            'subtasks' => ['nullable', 'array', 'max:50'],
            'subtasks.*.title' => ['required_with:subtasks', 'string', 'max:200'],
            'subtasks.*.is_completed' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Associative Array berisi pesan error validasi kustom dalam Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul tugas wajib diisi.',
            'title.min' => 'Judul tugas minimal terdiri dari 2 karakter.',
            'title.max' => 'Judul tugas maksimal 200 karakter.',
            'description.max' => 'Deskripsi tugas maksimal 5000 karakter.',
            'status.in' => 'Status tugas tidak valid (pilih: todo, in_progress, atau completed).',
            'priority.in' => 'Prioritas tugas harus bernilai low, medium, atau high.',
            'category.max' => 'Nama kategori maksimal 80 karakter.',
            'due_date.date' => 'Format tanggal tenggat waktu tidak valid.',
            'subtasks.array' => 'Format daftar sub-tugas tidak valid.',
            'subtasks.*.title.required_with' => 'Judul setiap item sub-tugas tidak boleh kosong.',
            'subtasks.*.title.max' => 'Judul sub-tugas maksimal 200 karakter.',
        ];
    }
}

