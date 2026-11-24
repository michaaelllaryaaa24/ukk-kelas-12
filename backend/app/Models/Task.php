<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model Task
 * ----------
 * Merepresentasikan entitas tugas utama di dalam tabel `tasks`.
 * Berisi definisi relasi database (belongsTo User & hasMany Subtask) serta Query Scope `scopeFilter`.
 */
class Task extends Model
{
    use HasFactory;

    /**
     * Indexed Array daftar kolom yang dapat diisi melalui Create/Update (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'priority',
        'category',
        'due_date',
        'is_pinned',
    ];

    /**
     * Associative Array untuk memastikan tipe data konsisten saat dibaca dari database.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'is_pinned' => 'boolean',
    ];

    /**
     * RELASI DATABASE (Inverse One-to-Many / belongsTo):
     * Setiap Task dimiliki oleh satu User tertentu melalui foreign key `user_id`.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * RELASI DATABASE (One-to-Many / hasMany):
     * Satu Task dapat memiliki banyak Subtask (daftar periksa / checklist).
     * Ketika Task dihapus, seluruh Subtask terkait ikut terhapus (cascade on delete).
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class)->orderBy('id', 'asc');
    }

    /**
     * Query Scope `scopeFilter`:
     * Memfilter dan mengurutkan daftar tugas secara dinamis berdasarkan Associative Array `$filters`.
     * Mendukung pencarian teks, status, prioritas, kategori, tugas pinned, rentang waktu, dan pengurutan.
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        $today = Carbon::today()->toDateString();

        // Filter pencarian berdasarkan judul atau deskripsi tugas
        $query->when($filters['search'] ?? null, function (Builder $q, string $search) {
            $q->where(function (Builder $subQuery) use ($search) {
                $subQuery->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        });

        // Filter berdasarkan status ('todo', 'in_progress', 'completed')
        $query->when($filters['status'] ?? null, function (Builder $q, string $status) {
            if ($status !== 'all') {
                $q->where('status', $status);
            }
        });

        // Filter berdasarkan prioritas ('low', 'medium', 'high')
        $query->when($filters['priority'] ?? null, function (Builder $q, string $priority) {
            if ($priority !== 'all') {
                $q->where('priority', $priority);
            }
        });

        // Filter berdasarkan kategori
        $query->when($filters['category'] ?? null, function (Builder $q, string $category) {
            if ($category !== 'all') {
                $q->where('category', $category);
            }
        });

        // Filter hanya tugas yang disematkan (Pinned)
        if (!empty($filters['pinned']) && filter_var($filters['pinned'], FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_pinned', true);
        }

        // Filter berdasarkan rentang waktu sidebar ('today', 'upcoming', 'overdue')
        $query->when($filters['timeframe'] ?? null, function (Builder $q, string $timeframe) use ($today) {
            if ($timeframe === 'today') {
                $q->whereDate('due_date', $today);
            } elseif ($timeframe === 'upcoming') {
                $q->whereDate('due_date', '>', $today)
                    ->where('status', '!=', 'completed');
            } elseif ($timeframe === 'overdue') {
                $q->whereDate('due_date', '<', $today)
                    ->where('status', '!=', 'completed');
            }
        });

        // Selalu letakkan tugas yang disematkan (is_pinned = true) di urutan teratas
        $query->orderByDesc('is_pinned');

        // Pengurutan sekunder berdasarkan parameter `sort`
        $sort = $filters['sort'] ?? 'newest';
        if ($sort === 'due_date') {
            $query->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC')
                ->orderBy('due_date', 'asc')
                ->orderByDesc('id');
        } elseif ($sort === 'priority') {
            $query->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC")
                ->orderByDesc('id');
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }

        return $query;
    }

    /**
     * Atribut helper untuk mengecek apakah tugas sudah melewati tenggat waktu (overdue).
     */
    public function getIsOverdueAttribute(): bool
    {
        if (!$this->due_date || $this->status === 'completed') {
            return false;
        }

        return Carbon::parse($this->due_date)->lt(Carbon::today());
    }
}
