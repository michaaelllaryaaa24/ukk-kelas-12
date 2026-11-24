<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormRequest: LoginRequest
 * -------------------------
 * Memvalidasi input email dan password saat proses login pengguna.
 * Seluruh pesan kesalahan menggunakan Bahasa Indonesia yang jelas.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Aturan validasi dalam bentuk Associative Array.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ];
    }

    /**
     * Pesan validasi kustom dalam Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format alamat email tidak valid.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal terdiri dari 6 karakter.',
        ];
    }
}

