<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Service: DemoTaskService
 * ------------------------
 * Menyediakan data simulasi UKK PPLG/RPL yang realistis (tugas + sub-tugas)
 * untuk keperluan pengujian sidang UKK maupun tombol "Muat Ulang Data Simulasi UKK".
 */
class DemoTaskService
{
    /**
     * Mengisi ulang atau menambahkan daftar tugas simulasi UKK untuk pengguna tertentu.
     * Menggunakan Multidimensional Array yang diproses menggunakan perulangan `foreach`.
     *
     * @param  bool  $replaceExisting  Jika true, tugas lama milik user dihapus terlebih dahulu.
     * @return int Jumlah tugas yang berhasil dibuat.
     */
    public static function seedForUser(User $user, bool $replaceExisting = false): int
    {
        return DB::transaction(function () use ($user, $replaceExisting) {
            if ($replaceExisting) {
                // Menghapus tugas lama user (otomatis menghapus subtasks via cascade on delete)
                $user->tasks()->delete();
            }

            $today = Carbon::today();

            // Multidimensional Array: setiap elemen berisi Associative Array data Task + Subtasks
            $sampleTasks = [
                [
                    'title' => 'Merancang ERD & Relasi Database MySQL',
                    'description' => 'Menyusun Entity Relationship Diagram untuk tabel users, tasks, dan subtasks lengkap dengan foreign key cascade on delete serta indeks pencarian.',
                    'status' => 'completed',
                    'priority' => 'high',
                    'category' => 'Basis Data',
                    'due_date' => $today->copy()->subDays(2)->toDateString(),
                    'is_pinned' => false,
                    'subtasks' => [
                        ['title' => 'Identifikasi entitas dan atribut utama UKK', 'is_completed' => true],
                        ['title' => 'Tentukan relasi One-to-Many users -> tasks', 'is_completed' => true],
                        ['title' => 'Tentukan relasi One-to-Many tasks -> subtasks', 'is_completed' => true],
                        ['title' => 'Ekspor skema SQL untuk lampiran dokumentasi', 'is_completed' => true],
                    ],
                ],
                [
                    'title' => 'Implementasi REST API & Autentikasi Laravel Sanctum',
                    'description' => 'Membangun endpoint Login, Register, Logout, Profile, serta CRUD Task & Subtask menggunakan FormRequest, API Resource, dan scopeFilter.',
                    'status' => 'in_progress',
                    'priority' => 'high',
                    'category' => 'UKK Backend',
                    'due_date' => $today->toDateString(),
                    'is_pinned' => true,
                    'subtasks' => [
                        ['title' => 'Konfigurasi Laravel Sanctum & tabel personal_access_tokens', 'is_completed' => true],
                        ['title' => 'Buat FormRequest validasi bahasa Indonesia', 'is_completed' => true],
                        ['title' => 'Tambahkan Query Scope filter & sorting pada Task', 'is_completed' => true],
                        ['title' => 'Uji seluruh endpoint via Postman / HTTP Client', 'is_completed' => false],
                    ],
                ],
                [
                    'title' => 'Finalisasi Slicing UI Dashboard React + Tailwind (60-30-10)',
                    'description' => 'Menyempurnakan tampilan editorial presisi dengan palet 60-30-10, Light/Dark mode persisten, Dual View (List & Kanban), serta Pomodoro Timer.',
                    'status' => 'in_progress',
                    'priority' => 'high',
                    'category' => 'UKK Frontend',
                    'due_date' => $today->toDateString(),
                    'is_pinned' => true,
                    'subtasks' => [
                        ['title' => 'Setup Vite proxy /api menuju backend port 8000', 'is_completed' => true],
                        ['title' => 'Implementasi Sidebar, Filter Bar, & Task Modal', 'is_completed' => true],
                        ['title' => 'Verifikasi responsivitas tampilan desktop & mobile', 'is_completed' => false],
                    ],
                ],
                [
                    'title' => 'Pengumpulan Proposal & Revisi Bab 1-3 Laporan UKK',
                    'description' => 'Melengkapi dokumen analisis kebutuhan sistem, flowchart aplikasi, serta daftar pustaka untuk diserahkan ke guru pembimbing.',
                    'status' => 'todo',
                    'priority' => 'medium',
                    'category' => 'Dokumentasi',
                    'due_date' => $today->copy()->subDay()->toDateString(),
                    'is_pinned' => false,
                    'subtasks' => [
                        ['title' => 'Perbaiki diagram alur autentikasi Sanctum', 'is_completed' => true],
                        ['title' => 'Tambahkan tangkapan layar struktur folder project', 'is_completed' => false],
                        ['title' => 'Cetak draf laporan untuk tanda tangan pembimbing', 'is_completed' => false],
                    ],
                ],
                [
                    'title' => 'Pengujian Black-Box Testing CRUD & Validasi Error',
                    'description' => 'Melakukan skenario uji coba input kosong, email duplikat, tambah/edit/hapus tugas, checklist sub-tugas, dan ekspor laporan CSV.',
                    'status' => 'todo',
                    'priority' => 'medium',
                    'category' => 'Quality Assurance',
                    'due_date' => $today->copy()->addDays(2)->toDateString(),
                    'is_pinned' => false,
                    'subtasks' => [
                        ['title' => 'Uji validasi login & register form berbahasa Indonesia', 'is_completed' => false],
                        ['title' => 'Uji perpindahan status di Kanban Board', 'is_completed' => false],
                        ['title' => 'Uji ekspor CSV dan tampilan Cetak Laporan UKK', 'is_completed' => false],
                    ],
                ],
                [
                    'title' => 'Latihan Presentasi & Demo Aplikasi Sidang UKK',
                    'description' => 'Menyiapkan alur demo aplikasi selama 10 menit dan memahami penjelasan kode CRUD, tipe Array, serta relasi Eloquent untuk tanya-jawab penguji.',
                    'status' => 'todo',
                    'priority' => 'high',
                    'category' => 'Presentasi',
                    'due_date' => $today->copy()->addDays(4)->toDateString(),
                    'is_pinned' => false,
                    'subtasks' => [
                        ['title' => 'Pahami alur Token Sanctum & Middleware auth:sanctum', 'is_completed' => true],
                        ['title' => 'Review komentar kode hasMany, belongsTo, & Array', 'is_completed' => false],
                        ['title' => 'Siapkan slide ringkasan arsitektur aplikasi', 'is_completed' => false],
                    ],
                ],
                [
                    'title' => 'Konfigurasi Launcher Root (`start.js` & `run.bat`)',
                    'description' => 'Memastikan launcher dapat mengecek port MySQL 3306 dan menjalankan server Laravel serta Vite secara paralel tanpa warning.',
                    'status' => 'completed',
                    'priority' => 'low',
                    'category' => 'DevOps Lokal',
                    'due_date' => $today->copy()->subDays(1)->toDateString(),
                    'is_pinned' => false,
                    'subtasks' => [
                        ['title' => 'Uji pengecekan port MySQL 3306 saat Laragon aktif', 'is_completed' => true],
                        ['title' => 'Pastikan node start.js bebas warning DEP0190', 'is_completed' => true],
                    ],
                ],
            ];

            // Iterasi array multidimensi untuk menyimpan Task beserta relasi Subtasks
            foreach ($sampleTasks as $taskData) {
                $subtasksData = $taskData['subtasks'] ?? [];
                unset($taskData['subtasks']);

                /** @var Task $task */
                $task = $user->tasks()->create($taskData);

                foreach ($subtasksData as $subtaskItem) {
                    $task->subtasks()->create($subtaskItem);
                }
            }

            // Isi starter Sticky Notes jika user belum memiliki catatan (atau saat reset simulasi)
            if ($replaceExisting || $user->stickyNotes()->count() === 0) {
                if ($replaceExisting) {
                    $user->stickyNotes()->delete();
                }

                $starterNotes = [
                    [
                        'title' => 'Ide Proyek UKK',
                        'content' => "- Rangkum materi alur API Sanctum\n- Siapkan diagram ERD relasi tabel\n- Uji coba tombol ekspor CSV",
                        'color' => 'blue',
                        'pos_x' => 110,
                        'pos_y' => 70,
                    ],
                    [
                        'title' => 'Target Pekan Ini',
                        'content' => "1. Selesaikan validasi FormRequest\n2. Review materi sidang akhir\n3. Latihan demo aplikasi 10 menit",
                        'color' => 'purple',
                        'pos_x' => 420,
                        'pos_y' => 50,
                    ],
                    [
                        'title' => 'Checklist Persiapan',
                        'content' => "- Nyalakan MySQL Laragon (3306)\n- Cek file database db_taskflow\n- Siapkan charger laptop",
                        'color' => 'green',
                        'pos_x' => 230,
                        'pos_y' => 300,
                    ],
                    [
                        'title' => 'Catatan Penting',
                        'content' => "Tulis catatan cepat atau ide fitur di sini...\nKlik titik warna di pojok bawah untuk mengganti tema kartu.",
                        'color' => 'yellow',
                        'pos_x' => 560,
                        'pos_y' => 280,
                    ],
                ];

                foreach ($starterNotes as $noteData) {
                    $user->stickyNotes()->create($noteData);
                }
            }

            // Isi starter Schedule mingguan jika belum ada atau saat reset simulasi
            if ($replaceExisting || $user->schedules()->count() === 0) {
                self::seedSchedulesForUser($user, $replaceExisting);
            }

            return count($sampleTasks);
        });
    }

    /**
     * Mengisi jadwal mingguan UKK realistis di pekan berjalan (Senin - Sabtu) ke tabel `schedules`.
     */
    public static function seedSchedulesForUser(User $user, bool $replaceExisting = false): int
    {
        if ($replaceExisting) {
            $user->schedules()->delete();
        }

        $monday = Carbon::today()->startOfWeek(Carbon::MONDAY);

        $sampleSchedules = [
            [
                'title' => 'Briefing Proyek UKK',
                'location' => 'Lab PPLG 1, Ruang 312',
                'category' => 'Bimbingan',
                'date' => $monday->copy()->toDateString(),
                'start_time' => '07:00',
                'end_time' => '07:45',
                'color' => 'sand',
                'status' => 'done',
                'participants' => ['AF', 'BP'],
                'notes' => 'Pengecekan target sprint harian bersama guru pembimbing.',
            ],
            [
                'title' => 'Perencanaan Tim & ERD',
                'location' => 'Ruang Diskusi 200',
                'category' => 'Perencanaan',
                'date' => $monday->copy()->toDateString(),
                'start_time' => '08:00',
                'end_time' => '09:15',
                'color' => 'yellow',
                'status' => 'in_progress',
                'participants' => ['AF', 'RN', 'DS', 'MR'],
                'attachment_name' => 'Agenda_UKK.pdf',
                'notes' => 'Menyepakati relasi tabel users, tasks, subtasks, sticky_notes, dan schedules.',
            ],
            [
                'title' => 'Sesi Konsultasi Online',
                'location' => 'Google Meet · Kelas XII',
                'category' => 'Mentoring',
                'date' => $monday->copy()->addDays(1)->toDateString(),
                'start_time' => '07:00',
                'end_time' => '08:15',
                'color' => 'sand',
                'status' => 'scheduled',
                'participants' => ['AF'],
                'notes' => 'Review kode FormRequest dan Laravel Sanctum.',
            ],
            [
                'title' => 'Uji Koneksi API & DB',
                'location' => 'Lab Jaringan 2',
                'category' => 'Testing',
                'date' => $monday->copy()->addDays(1)->toDateString(),
                'start_time' => '08:30',
                'end_time' => '09:30',
                'color' => 'pink',
                'status' => 'scheduled',
                'participants' => ['AF', 'RN'],
                'notes' => 'Memastikan endpoint CRUD MySQL berjalan mulus.',
            ],
            [
                'title' => 'Implementasi UI Kanban',
                'location' => 'Studio Desain PPLG',
                'category' => 'Frontend',
                'date' => $monday->copy()->addDays(2)->toDateString(),
                'start_time' => '07:45',
                'end_time' => '08:45',
                'color' => 'sand',
                'status' => 'scheduled',
                'participants' => ['AF'],
            ],
            [
                'title' => 'Workshop React + Vite',
                'location' => 'Aula Utama, Lantai 2',
                'category' => 'Praktikum',
                'date' => $monday->copy()->addDays(2)->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:30',
                'color' => 'blue',
                'status' => 'in_progress',
                'participants' => ['AF', 'RN', 'DS', 'KL'],
                'notes' => 'Integrasi drag-and-drop dan state auto-save.',
            ],
            [
                'title' => 'Review Kode Sanctum',
                'location' => 'Lab RPL 1, Ruang 312',
                'category' => 'Backend',
                'date' => $monday->copy()->addDays(3)->toDateString(),
                'start_time' => '07:00',
                'end_time' => '08:15',
                'color' => 'sand',
                'status' => 'in_progress',
                'participants' => ['AF'],
            ],
            [
                'title' => 'Evaluasi Progres Mingguan',
                'location' => 'Ruang Pembimbing 104',
                'category' => 'Evaluasi',
                'date' => $monday->copy()->addDays(3)->toDateString(),
                'start_time' => '08:30',
                'end_time' => '10:15',
                'color' => 'sand',
                'status' => 'scheduled',
                'participants' => ['AF', 'BP'],
                'notes' => 'Penilaian kesiapan fitur CRUD, cetak laporan, dan database.',
            ],
            [
                'title' => 'Presentasi Hasil Sprint',
                'location' => 'Ruang Sidang 200',
                'category' => 'Presentasi',
                'date' => $monday->copy()->addDays(4)->toDateString(),
                'start_time' => '07:00',
                'end_time' => '08:30',
                'color' => 'yellow',
                'status' => 'scheduled',
                'participants' => ['AF', 'RN', 'DS', 'MR'],
                'attachment_name' => 'Laporan_UKK.pdf',
            ],
            [
                'title' => 'Simulasi Demo Akhir',
                'location' => 'Lab PPLG 2, Ruang 404',
                'category' => 'Sidang UKK',
                'date' => $monday->copy()->addDays(4)->toDateString(),
                'start_time' => '09:15',
                'end_time' => '10:30',
                'color' => 'blue',
                'status' => 'scheduled',
                'participants' => ['AF', 'RN', 'DS'],
            ],
            [
                'title' => 'Finalisasi Backup SQL',
                'location' => 'Mandiri · Rumah',
                'category' => 'DevOps',
                'date' => $monday->copy()->addDays(5)->toDateString(),
                'start_time' => '08:00',
                'end_time' => '09:15',
                'color' => 'sand',
                'status' => 'scheduled',
                'participants' => ['AF'],
            ],
        ];

        foreach ($sampleSchedules as $item) {
            $user->schedules()->create($item);
        }

        return count($sampleSchedules);
    }
}

