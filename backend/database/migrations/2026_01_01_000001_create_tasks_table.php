<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tabel `tasks` yang berelasi One-to-Many dengan tabel `users`.
     * Jika user dihapus, seluruh tugas miliknya otomatis terhapus (cascade on delete).
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'completed'])->default('todo');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->string('category', 80)->default('Umum');
            $table->date('due_date')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'due_date']);
            $table->index(['user_id', 'is_pinned']);
        });
    }

    /**
     * Menghapus tabel `tasks` saat rollback migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};

