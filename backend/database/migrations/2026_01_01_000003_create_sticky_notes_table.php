<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat tabel `sticky_notes` yang berelasi One-to-Many dengan tabel `users`.
     */
    public function up(): void
    {
        Schema::create('sticky_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('title', 160)->default('Catatan Baru');
            $table->text('content')->nullable();
            $table->string('color', 20)->default('yellow');
            $table->integer('pos_x')->default(80);
            $table->integer('pos_y')->default(80);
            $table->json('connected_to')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    /**
     * Menghapus tabel `sticky_notes` saat rollback migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('sticky_notes');
    }
};

