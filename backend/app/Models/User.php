<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Model User
 * ----------
 * Merepresentasikan data pengguna (peserta UKK / pelajar / pekerja) di tabel `users`.
 * Menggunakan trait `HasApiTokens` dari Laravel Sanctum untuk autentikasi berbasis API Token.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Indexed Array berisi daftar kolom yang boleh diisi secara massal (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
    ];

    /**
     * Indexed Array kolom sensitif yang disembunyikan saat model dikonversi ke JSON.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Associative Array untuk konversi tipe data otomatis (Casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * RELASI DATABASE (One-to-Many / hasMany):
     * Satu User dapat memiliki banyak Task (Tugas).
     * Foreign key berada pada kolom `user_id` di tabel `tasks`.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * RELASI DATABASE (One-to-Many / hasMany):
     * Satu User dapat memiliki banyak StickyNote di Papan Catatan Bebas.
     */
    public function stickyNotes(): HasMany
    {
        return $this->hasMany(StickyNote::class)->orderBy('id', 'asc');
    }

    /**
     * RELASI DATABASE (One-to-Many / hasMany):
     * Satu User dapat memiliki banyak Schedule (Jadwal Agenda).
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class)->orderBy('date', 'asc')->orderBy('start_time', 'asc');
    }
}
