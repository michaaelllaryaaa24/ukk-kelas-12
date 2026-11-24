<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Services\DemoTaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller: ScheduleController
 * ------------------------------
 * Mengelola operasi CRUD (Create, Read, Update, Delete) untuk tabel `schedules`
 * sehingga jadwal mingguan, harian, dan bulanan tersimpan permanen di database MySQL.
 */
class ScheduleController extends Controller
{
    private function authorizeOwnership(Request $request, Schedule $schedule): void
    {
        if ($schedule->user_id !== $request->user()->id) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses atau mengubah jadwal ini.');
        }
    }

    /**
     * Format data Schedule untuk respons JSON API.
     *
     * @return array<string, mixed>
     */
    private function formatSchedule(Schedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'user_id' => $schedule->user_id,
            'title' => $schedule->title,
            'location' => $schedule->location,
            'category' => $schedule->category,
            'date' => $schedule->date ? $schedule->date->format('Y-m-d') : null,
            'start_time' => $schedule->start_time,
            'end_time' => $schedule->end_time,
            'color' => $schedule->color,
            'status' => $schedule->status,
            'participants' => $schedule->participants ?? [],
            'attachment_name' => $schedule->attachment_name,
            'notes' => $schedule->notes,
            'created_at' => $schedule->created_at?->toISOString(),
            'updated_at' => $schedule->updated_at?->toISOString(),
        ];
    }

    /**
     * READ: Mengambil seluruh jadwal milik user (mendukung filter rentang tanggal `start_date` & `end_date`).
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->schedules();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->input('start_date'), $request->input('end_date')]);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $schedules = $query->get()->map(fn (Schedule $item) => $this->formatSchedule($item));

        return response()->json([
            'data' => $schedules,
        ]);
    }

    /**
     * CREATE: Menambahkan agenda jadwal baru ke tabel `schedules`.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:160'],
            'location' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:60'],
            'date' => ['required', 'date'],
            'start_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'end_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'color' => ['nullable', 'in:sand,yellow,blue,pink,green'],
            'status' => ['nullable', 'in:scheduled,in_progress,done'],
            'participants' => ['nullable', 'array', 'max:10'],
            'participants.*' => ['string', 'max:6'],
            'attachment_name' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'title.required' => 'Judul agenda jadwal wajib diisi.',
            'title.min' => 'Judul agenda minimal 2 karakter.',
            'date.required' => 'Tanggal pelaksanaan wajib dipilih.',
            'date.date' => 'Format tanggal jadwal tidak valid.',
            'start_time.required' => 'Jam mulai wajib diisi.',
            'start_time.regex' => 'Format jam mulai harus JJ:MM (contoh 08:00).',
            'end_time.required' => 'Jam selesai wajib diisi.',
            'end_time.regex' => 'Format jam selesai harus JJ:MM (contoh 09:30).',
        ]);

        $schedule = $request->user()->schedules()->create([
            'title' => trim($validated['title']),
            'location' => $validated['location'] ?? 'Lab RPL 1',
            'category' => $validated['category'] ?? 'Agenda UKK',
            'date' => $validated['date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'color' => $validated['color'] ?? 'sand',
            'status' => $validated['status'] ?? 'scheduled',
            'participants' => $validated['participants'] ?? [],
            'attachment_name' => $validated['attachment_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Agenda jadwal baru berhasil disimpan ke database.',
            'data' => $this->formatSchedule($schedule),
        ], 201);
    }

    /**
     * UPDATE: Memperbarui detail jadwal, jam, warna, maupun status (`scheduled`/`in_progress`/`done`).
     */
    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeOwnership($request, $schedule);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'min:2', 'max:160'],
            'location' => ['nullable', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'max:60'],
            'date' => ['sometimes', 'date'],
            'start_time' => ['sometimes', 'regex:/^\d{2}:\d{2}$/'],
            'end_time' => ['sometimes', 'regex:/^\d{2}:\d{2}$/'],
            'color' => ['sometimes', 'in:sand,yellow,blue,pink,green'],
            'status' => ['sometimes', 'in:scheduled,in_progress,done'],
            'participants' => ['nullable', 'array', 'max:10'],
            'participants.*' => ['string', 'max:6'],
            'attachment_name' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'title.required' => 'Judul agenda tidak boleh kosong.',
            'start_time.regex' => 'Format jam mulai harus JJ:MM.',
            'end_time.regex' => 'Format jam selesai harus JJ:MM.',
        ]);

        $schedule->update($validated);

        return response()->json([
            'message' => 'Perubahan jadwal berhasil disimpan.',
            'data' => $this->formatSchedule($schedule->fresh()),
        ]);
    }

    /**
     * DELETE: Menghapus agenda jadwal dari database MySQL.
     */
    public function destroy(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeOwnership($request, $schedule);
        $schedule->delete();

        return response()->json([
            'message' => 'Agenda jadwal berhasil dihapus.',
        ]);
    }

    /**
     * SEED JADWAL SIMULASI: Mengisi contoh jadwal mingguan UKK untuk user aktif.
     */
    public function seedDemoSchedules(Request $request): JsonResponse
    {
        $user = $request->user();
        DemoTaskService::seedSchedulesForUser($user, true);

        $schedules = $user->schedules()->get()->map(fn (Schedule $item) => $this->formatSchedule($item));

        return response()->json([
            'message' => 'Jadwal mingguan simulasi UKK berhasil dimuat.',
            'data' => $schedules,
        ]);
    }
}

