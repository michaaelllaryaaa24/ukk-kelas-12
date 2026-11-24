<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource: UserResource
 * --------------------------
 * Menstandarkan struktur respons JSON untuk data profil pengguna agar field sensitif tidak terekspos.
 */
class UserResource extends JsonResource
{
    /**
     * Mengubah model User menjadi Associative Array untuk respons JSON API.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role ?? 'Siswa XII PPLG',
            'avatar' => $this->avatar,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

