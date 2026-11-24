<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tabel `schedules` yang berelasi One-to-Many dengan tabel `users`.
     * Menyimpan agenda jadwal harian/mingguan lengkap dengan jam mulai-selesai, lokasi,
     * peserta, status, dan tema warna pastel.
     */
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('title', 160);
            $table->string('location', 120)->nullable();
            $table->string('category', 60)->default('Agenda UKK');
            $table->date('date');
            $table->string('start_time', 5)->default('08:00');
            $table->string('end_time', 5)->default('09:00');
            $table->string('color', 20)->default('sand');
            $table->string('status', 30)->default('scheduled');
            $table->json('participants')->nullable();
            $table->string('attachment_name', 120)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Menghapus tabel `schedules` saat rollback migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};

