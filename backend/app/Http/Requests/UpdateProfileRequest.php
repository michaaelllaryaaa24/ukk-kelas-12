<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormRequest: UpdateProfileRequest
 * ---------------------------------
 * Memvalidasi pembaruan data profil pengguna (Nama, Peran/Kelas, dan Avatar).
 */
class UpdateProfileRequest extends FormRequest
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
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'role' => ['required', 'string', 'min:2', 'max:100'],
            'avatar' => ['nullable', 'string', 'max:3000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap tidak boleh kosong.',
            'name.min' => 'Nama lengkap minimal 2 karakter.',
            'role.required' => 'Peran atau kelas wajib diisi.',
            'avatar.max' => 'Ukuran gambar avatar terlalu besar (maksimal sekitar 2 MB).',
        ];
    }
}

