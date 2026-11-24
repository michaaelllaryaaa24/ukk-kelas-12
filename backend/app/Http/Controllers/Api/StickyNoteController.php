<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StickyNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller: StickyNoteController
 * --------------------------------
 * Mengelola operasi CRUD catatan tempel (Sticky Notes) pada Papan Catatan Bebas
 * lengkap dengan koordinat posisi `(pos_x, pos_y)`, warna pastel, dan relasi antar catatan.
 */
class StickyNoteController extends Controller
{
    private function authorizeOwnership(Request $request, StickyNote $note): void
    {
        if ($note->user_id !== $request->user()->id) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses catatan ini.');
        }
    }

    /**
     * READ: Mengambil seluruh sticky notes milik user yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $notes = $request->user()->stickyNotes()->get();

        return response()->json([
            'data' => $notes,
        ]);
    }

    /**
     * CREATE: Membuat sticky note baru di papan catatan bebas.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'content' => ['nullable', 'string', 'max:5000'],
            'image_data' => ['nullable', 'string', 'max:5000000'],
            'color' => ['nullable', 'in:blue,purple,pink,yellow,green'],
            'pos_x' => ['nullable', 'integer', 'min:0', 'max:4000'],
            'pos_y' => ['nullable', 'integer', 'min:0', 'max:4000'],
            'connected_to' => ['nullable', 'array'],
            'connected_to.*' => ['integer'],
        ], [
            'title.max' => 'Judul catatan maksimal 160 karakter.',
            'image_data.max' => 'Ukuran gambar terlalu besar.',
            'color.in' => 'Pilihan warna catatan tidak valid.',
        ]);

        $note = $request->user()->stickyNotes()->create([
            'title' => $validated['title'] ?? 'Catatan Baru',
            'content' => $validated['content'] ?? '',
            'image_data' => $validated['image_data'] ?? null,
            'color' => $validated['color'] ?? 'yellow',
            'pos_x' => $validated['pos_x'] ?? 140,
            'pos_y' => $validated['pos_y'] ?? 120,
            'connected_to' => $validated['connected_to'] ?? [],
        ]);

        return response()->json([
            'message' => 'Catatan baru ditambahkan.',
            'data' => $note,
        ], 201);
    }

    /**
     * UPDATE: Memperbarui isi, warna, posisi drag `(pos_x, pos_y)`, atau koneksi garis panah catatan.
     */
    public function update(Request $request, StickyNote $note): JsonResponse
    {
        $this->authorizeOwnership($request, $note);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'content' => ['nullable', 'string', 'max:5000'],
            'image_data' => ['nullable', 'string', 'max:5000000'],
            'color' => ['sometimes', 'in:blue,purple,pink,yellow,green'],
            'pos_x' => ['sometimes', 'integer', 'min:0', 'max:4000'],
            'pos_y' => ['sometimes', 'integer', 'min:0', 'max:4000'],
            'connected_to' => ['sometimes', 'array'],
            'connected_to.*' => ['integer'],
        ]);

        $note->update($validated);

        return response()->json([
            'message' => 'Catatan tersimpan.',
            'data' => $note->fresh(),
        ]);
    }

    /**
     * DELETE: Menghapus satu sticky note beserta referensinya dari koneksi catatan lain.
     */
    public function destroy(Request $request, StickyNote $note): JsonResponse
    {
        $this->authorizeOwnership($request, $note);

        $deletedId = $note->id;
        $user = $request->user();
        $note->delete();

        // Bersihkan referensi panah yang mengarah ke note yang dihapus
        $otherNotes = $user->stickyNotes()->get();
        foreach ($otherNotes as $other) {
            $links = $other->connected_to ?? [];
            if (in_array($deletedId, $links, true)) {
                $other->update([
                    'connected_to' => array_values(array_filter($links, fn ($id) => $id !== $deletedId)),
                ]);
            }
        }

        return response()->json([
            'message' => 'Catatan dihapus.',
        ]);
    }

    /**
     * CLEAR ALL: Menghapus seluruh sticky notes milik user pada Papan Catatan Bebas.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $request->user()->stickyNotes()->delete();

        return response()->json([
            'message' => 'Seluruh catatan di papan telah dibersihkan.',
        ]);
    }
}

