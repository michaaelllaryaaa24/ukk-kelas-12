<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan kolom `image_data` (longText nullable) pada tabel `sticky_notes`
     * untuk menyimpan gambar yang dimasukkan / di-drag-and-drop ke catatan tempel.
     */
    public function up(): void
    {
        Schema::table('sticky_notes', function (Blueprint $table) {
            $table->longText('image_data')->nullable()->after('content');
        });
    }

    /**
     * Menghapus kolom `image_data` saat rollback.
     */
    public function down(): void
    {
        Schema::table('sticky_notes', function (Blueprint $table) {
            $table->dropColumn('image_data');
        });
    }
};

