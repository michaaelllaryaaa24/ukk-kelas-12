<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model Schedule
 * --------------
 * Merepresentasikan entitas jadwal kegiatan di tabel `schedules`.
 * Setiap Schedule dimiliki oleh satu User (`belongsTo`).
 */
class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'location',
        'category',
        'date',
        'start_time',
        'end_time',
        'color',
        'status',
        'participants',
        'attachment_name',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'participants' => 'array',
    ];

    /**
     * RELASI DATABASE (Inverse One-to-Many / belongsTo):
     * Setiap Schedule dimiliki oleh satu User tertentu.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

