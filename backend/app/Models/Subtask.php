<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model Subtask
 * -------------
 * Merepresentasikan item checklist / sub-tugas di dalam tabel `subtasks`.
 * Berelasi langsung (belongsTo) ke satu Task induk.
 */
class Subtask extends Model
{
    use HasFactory;

    /**
     * Indexed Array daftar kolom yang dapat diisi secara massal (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'task_id',
        'title',
        'is_completed',
    ];

    /**
     * Associative Array casting tipe data agar `is_completed` selalu bernilai boolean (true/false).
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_completed' => 'boolean',
    ];

    /**
     * RELASI DATABASE (Inverse One-to-Many / belongsTo):
     * Setiap Subtask merupakan bagian dari satu Task induk melalui foreign key `task_id`.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}

