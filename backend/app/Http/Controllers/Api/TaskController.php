<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\SubtaskResource;
use App\Http\Resources\TaskResource;
use App\Models\Subtask;
use App\Models\Task;
use App\Services\DemoTaskService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controller: TaskController
 * --------------------------
 * Mengelola seluruh operasi CRUD (Create, Read, Update, Delete) untuk entitas Task & Subtask,
 * perhitungan statistik produktivitas real-time, fitur Pin, serta muat ulang data simulasi UKK.
 */
class TaskController extends Controller
{
    /**
     * Memastikan tugas yang diakses benar-benar milik user yang sedang login (Otorisasi Kepemilikan).
     */
    private function authorizeOwnership(Request $request, Task $task): void
    {
        if ($task->user_id !== $request->user()->id) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses atau mengubah tugas ini.');
        }
    }

    /**
     * Menghitung ringkasan metrik dashboard dari seluruh tugas milik user yang sedang login.
     * Mengembalikan Associative Array statistik serta Indexed Array kategori unik.
     *
     * @return array<string, mixed>
     */
    private function buildUserStats(int $userId): array
    {
        $today = Carbon::today()->toDateString();

        // Mengambil seluruh tugas user untuk kalkulasi metrik yang akurat
        $allTasks = Task::where('user_id', $userId)->get();

        $total = $allTasks->count();
        $todo = $allTasks->where('status', 'todo')->count();
        $inProgress = $allTasks->where('status', 'in_progress')->count();
        $completed = $allTasks->where('status', 'completed')->count();
        $pinned = $allTasks->where('is_pinned', true)->count();

        $overdue = $allTasks->filter(function (Task $task) use ($today) {
            return $task->status !== 'completed'
                && $task->due_date !== null
                && $task->due_date->format('Y-m-d') < $today;
        })->count();

        $dueToday = $allTasks->filter(function (Task $task) use ($today) {
            return $task->due_date !== null
                && $task->due_date->format('Y-m-d') === $today;
        })->count();

        $upcoming = $allTasks->filter(function (Task $task) use ($today) {
            return $task->status !== 'completed'
                && $task->due_date !== null
                && $task->due_date->format('Y-m-d') > $today;
        })->count();

        // Indexed Array berisi daftar kategori unik milik user (diurutkan alfabetis)
        $categories = $allTasks->pluck('category')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return [
            'total' => $total,
            'todo' => $todo,
            'in_progress' => $inProgress,
            'completed' => $completed,
            'overdue' => $overdue,
            'today' => $dueToday,
            'upcoming' => $upcoming,
            'pinned' => $pinned,
            'completion_rate' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
            'categories' => $categories,
        ];
    }

    /**
     * READ (Daftar Tugas + Filter + Statistik):
     * Mengambil semua tugas milik user beserta relasi `subtasks` (Eager Loading via `with('subtasks')`),
     * menerapkan Query Scope `filter()`, lalu mengembalikan koleksi TaskResource dan stats.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Associative Array berisi parameter query filter dari frontend
        $filters = $request->only([
            'search',
            'status',
            'priority',
            'category',
            'pinned',
            'timeframe',
            'sort',
        ]);

        // Relasi hasMany melalui $user->tasks() + eager loading subtasks agar hemat query (anti N+1)
        $tasks = $user->tasks()
            ->with('subtasks')
            ->filter($filters)
            ->get();

        return response()->json([
            'data' => TaskResource::collection($tasks),
            'stats' => $this->buildUserStats($user->id),
        ]);
    }

    /**
     * CREATE (Tambah Tugas Baru + Sub-tugas):
     * Menyimpan tugas baru ke tabel `tasks` sekaligus item checklist ke tabel `subtasks`
     * di dalam transaksi database agar atomik.
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $task = DB::transaction(function () use ($user, $validated) {
            // Membuat Task melalui relasi hasMany `tasks()` milik User
            /** @var Task $createdTask */
            $createdTask = $user->tasks()->create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'todo',
                'priority' => $validated['priority'] ?? 'medium',
                'category' => $validated['category'] ?? 'Umum',
                'due_date' => $validated['due_date'] ?? null,
                'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
            ]);

            // Jika terdapat Array of Objects `subtasks`, simpan menggunakan perulangan `foreach`
            if (!empty($validated['subtasks']) && is_array($validated['subtasks'])) {
                foreach ($validated['subtasks'] as $subtaskItem) {
                    $title = trim((string) ($subtaskItem['title'] ?? ''));
                    if ($title !== '') {
                        $createdTask->subtasks()->create([
                            'title' => $title,
                            'is_completed' => (bool) ($subtaskItem['is_completed'] ?? false),
                        ]);
                    }
                }
            }

            return $createdTask->load('subtasks');
        });

        return response()->json([
            'message' => 'Tugas baru berhasil ditambahkan.',
            'data' => new TaskResource($task),
            'stats' => $this->buildUserStats($user->id),
        ], 201);
    }

    /**
     * READ SINGLE (Detail Satu Tugas):
     * Menampilkan detail satu tugas beserta seluruh sub-tugasnya.
     */
    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        $task->load('subtasks');

        return response()->json([
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * UPDATE (Ubah Tugas + Sinkronisasi Sub-tugas):
     * Memperbarui informasi tugas, status (termasuk pindah kolom Kanban), prioritas, maupun checklist.
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        $validated = $request->validated();
        $userId = $request->user()->id;

        $updatedTask = DB::transaction(function () use ($task, $validated) {
            // Associative Array field utama yang di-update jika tersedia pada payload
            $taskPayload = collect($validated)
                ->only(['title', 'description', 'status', 'priority', 'category', 'due_date', 'is_pinned'])
                ->toArray();

            if (!empty($taskPayload)) {
                $task->update($taskPayload);
            }

            // Sinkronisasi daftar Sub-tugas apabila dikirim dari modal edit
            if (array_key_exists('subtasks', $validated)) {
                $incomingSubtasks = $validated['subtasks'] ?? [];
                $retainedIds = []; // Indexed Array untuk menyimpan ID subtask yang masih dipertahankan

                foreach ($incomingSubtasks as $item) {
                    $title = trim((string) ($item['title'] ?? ''));
                    if ($title === '') {
                        continue;
                    }

                    if (!empty($item['id'])) {
                        $existing = $task->subtasks()->where('id', $item['id'])->first();
                        if ($existing) {
                            $existing->update([
                                'title' => $title,
                                'is_completed' => (bool) ($item['is_completed'] ?? false),
                            ]);
                            $retainedIds[] = $existing->id;
                            continue;
                        }
                    }

                    $newSubtask = $task->subtasks()->create([
                        'title' => $title,
                        'is_completed' => (bool) ($item['is_completed'] ?? false),
                    ]);
                    $retainedIds[] = $newSubtask->id;
                }

                // Hapus sub-tugas lama yang tidak lagi ada di daftar terbaru
                $task->subtasks()->whereNotIn('id', $retainedIds)->delete();
            }

            return $task->fresh(['subtasks']);
        });

        return response()->json([
            'message' => 'Perubahan tugas berhasil disimpan.',
            'data' => new TaskResource($updatedTask),
            'stats' => $this->buildUserStats($userId),
        ]);
    }

    /**
     * DELETE (Hapus Tugas):
     * Menghapus tugas dari database MySQL (otomatis menghapus sub-tugas terkait via cascade).
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        $userId = $request->user()->id;
        $task->delete();

        return response()->json([
            'message' => 'Tugas berhasil dihapus.',
            'stats' => $this->buildUserStats($userId),
        ]);
    }

    /**
     * UPDATE CEPAT (Toggle Pin / Tandai Penting):
     * Membalikkan status `is_pinned` agar tugas penting langsung berada di urutan atas.
     */
    public function togglePin(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        $task->update([
            'is_pinned' => !$task->is_pinned,
        ]);

        return response()->json([
            'message' => $task->is_pinned ? 'Tugas disematkan sebagai prioritas.' : 'Sematkan tugas dilepas.',
            'data' => new TaskResource($task->load('subtasks')),
            'stats' => $this->buildUserStats($request->user()->id),
        ]);
    }

    /**
     * CREATE SUBTASK:
     * Menambahkan satu item sub-tugas baru langsung ke dalam tugas induk.
     */
    public function storeSubtask(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        $validated = $request->validate([
            'title' => ['required', 'string', 'min:1', 'max:200'],
        ], [
            'title.required' => 'Judul sub-tugas wajib diisi.',
            'title.max' => 'Judul sub-tugas maksimal 200 karakter.',
        ]);

        $subtask = $task->subtasks()->create([
            'title' => trim($validated['title']),
            'is_completed' => false,
        ]);

        return response()->json([
            'message' => 'Sub-tugas berhasil ditambahkan.',
            'subtask' => new SubtaskResource($subtask),
            'data' => new TaskResource($task->fresh(['subtasks'])),
        ], 201);
    }

    /**
     * UPDATE SUBTASK (Toggle Centang Checklist):
     * Membalikkan status selesai (`is_completed`) pada satu sub-tugas milik Task tertentu.
     */
    public function toggleSubtask(Request $request, Task $task, Subtask $subtask): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        if ($subtask->task_id !== $task->id) {
            abort(404, 'Sub-tugas tidak ditemukan pada tugas ini.');
        }

        $subtask->update([
            'is_completed' => !$subtask->is_completed,
        ]);

        return response()->json([
            'message' => 'Status sub-tugas diperbarui.',
            'subtask' => new SubtaskResource($subtask),
            'data' => new TaskResource($task->fresh(['subtasks'])),
        ]);
    }

    /**
     * DELETE SUBTASK:
     * Menghapus satu item sub-tugas dari tugas induk.
     */
    public function destroySubtask(Request $request, Task $task, Subtask $subtask): JsonResponse
    {
        $this->authorizeOwnership($request, $task);

        if ($subtask->task_id !== $task->id) {
            abort(404, 'Sub-tugas tidak ditemukan pada tugas ini.');
        }

        $subtask->delete();

        return response()->json([
            'message' => 'Sub-tugas berhasil dihapus.',
            'data' => new TaskResource($task->fresh(['subtasks'])),
        ]);
    }

    /**
     * SEED DATA SIMULASI UKK:
     * Menghapus tugas saat ini milik user dan mengisinya ulang dengan 7 contoh tugas UKK PPLG/RPL
     * beserta sub-tugasnya untuk keperluan presentasi & demonstrasi.
     */
    public function seedDemoTasks(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = DemoTaskService::seedForUser($user, true);

        $tasks = $user->tasks()
            ->with('subtasks')
            ->filter([])
            ->get();

        return response()->json([
            'message' => "Berhasil memuat {$count} tugas simulasi UKK PPLG beserta sub-tugasnya.",
            'data' => TaskResource::collection($tasks),
            'stats' => $this->buildUserStats($user->id),
        ]);
    }
}

