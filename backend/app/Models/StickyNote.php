<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model StickyNote
 * ----------------
 * Merepresentasikan catatan tempel (Sticky Notes) pada fitur Papan Catatan Bebas.
 * Berelasi langsung (belongsTo) ke satu User pemilik catatan.
 */
class StickyNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'image_data',
        'color',
        'pos_x',
        'pos_y',
        'connected_to',
    ];

    protected $casts = [
        'pos_x' => 'integer',
        'pos_y' => 'integer',
        'connected_to' => 'array',
    ];

    /**
     * RELASI DATABASE (Inverse One-to-Many / belongsTo):
     * Setiap StickyNote dimiliki oleh satu User melalui foreign key `user_id`.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

