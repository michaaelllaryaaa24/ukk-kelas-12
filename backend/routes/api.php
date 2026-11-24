<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\StickyNoteController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — TaskFlow UKK PPLG/RPL
|--------------------------------------------------------------------------
| Seluruh endpoint di file ini otomatis memiliki prefix `/api` (didaftarkan di bootstrap/app.php).
| Endpoint publik menangani Login/Register/Demo, sedangkan endpoint terproteksi
| wajib menyertakan header `Authorization: Bearer <token>` via middleware `auth:sanctum`.
*/

// Endpoint kesehatan server API (untuk pengecekan koneksi cepat)
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'TaskFlow UKK API',
        'timestamp' => now()->toISOString(),
    ]);
});

// --- Rute Autentikasi Publik (Tanpa Token) ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/demo-login', [AuthController::class, 'demoLogin']);

// --- Rute Terproteksi Laravel Sanctum (Wajib Login / Token Valid) ---
Route::middleware('auth:sanctum')->group(function () {
    // Manajemen Profil & Sesi Autentikasi
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Muat Ulang Data Simulasi UKK (Seeder khusus user yang sedang login)
    Route::post('/tasks/seed-demo', [TaskController::class, 'seedDemoTasks']);

    // CRUD Utama Tugas (READ index, CREATE store, READ show, UPDATE update, DELETE destroy)
    Route::apiResource('tasks', TaskController::class);

    // Aksi Cepat Pin / Tandai Penting
    Route::patch('/tasks/{task}/pin', [TaskController::class, 'togglePin']);

    // Manajemen Sub-tugas / Checklist (relasi hasMany dari Task)
    Route::post('/tasks/{task}/subtasks', [TaskController::class, 'storeSubtask']);
    Route::patch('/tasks/{task}/subtasks/{subtask}/toggle', [TaskController::class, 'toggleSubtask']);
    Route::delete('/tasks/{task}/subtasks/{subtask}', [TaskController::class, 'destroySubtask']);

    // Manajemen Sticky Notes (Papan Catatan Bebas)
    Route::get('/notes', [StickyNoteController::class, 'index']);
    Route::post('/notes', [StickyNoteController::class, 'store']);
    Route::put('/notes/{note}', [StickyNoteController::class, 'update']);
    Route::delete('/notes/{note}', [StickyNoteController::class, 'destroy']);
    Route::delete('/notes', [StickyNoteController::class, 'clearAll']);

    // Manajemen Schedule / Jadwal Agenda Mingguan (relasi hasMany dari User)
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::post('/schedules', [ScheduleController::class, 'store']);
    Route::post('/schedules/seed-demo', [ScheduleController::class, 'seedDemoSchedules']);
    Route::put('/schedules/{schedule}', [ScheduleController::class, 'update']);
    Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
});

