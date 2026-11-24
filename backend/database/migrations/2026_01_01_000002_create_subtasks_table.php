<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tabel `subtasks` yang berelasi One-to-Many dengan tabel `tasks`.
     * Jika tugas induk dihapus, seluruh sub-tugas otomatis terhapus (cascade on delete).
     */
    public function up(): void
    {
        Schema::create('subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')
                ->constrained('tasks')
                ->cascadeOnDelete();
            $table->string('title', 200);
            $table->boolean('is_completed')->default(false);
            $table->timestamps();

            $table->index('task_id');
        });
    }

    /**
     * Menghapus tabel `subtasks` saat rollback migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtasks');
    }
};

