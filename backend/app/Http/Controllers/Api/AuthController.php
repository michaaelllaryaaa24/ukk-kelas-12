<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\DemoTaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Controller: AuthController
 * --------------------------
 * Mengelola autentikasi pengguna berbasis Token (Laravel Sanctum):
 * Register (Create User), Login, Akun Demo Cepat, Get Profile (Read),
 * Update Profile (Update), dan Logout (Revoke Token).
 */
class AuthController extends Controller
{
    /**
     * CREATE USER (Register):
     * Mendaftarkan pengguna baru ke tabel `users` dan langsung menerbitkan token Sanctum.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // Associative Array berisi data tervalidasi dari RegisterRequest
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'], // Otomatis di-hash oleh cast 'hashed' di model User
            'role' => $validated['role'] ?? 'Siswa XII PPLG',
        ]);

        // Menerbitkan Personal Access Token dari Laravel Sanctum
        $token = $user->createToken('taskflow-auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Pendaftaran akun berhasil. Selamat datang di TaskFlow!',
            'token' => $token,
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * LOGIN (Autentikasi Token):
     * Memeriksa kecocokan email & kata sandi, lalu mengembalikan token Sanctum dan profil user.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Email atau kata sandi yang Anda masukkan salah.',
                'errors' => [
                    'email' => ['Kredensial tidak cocok dengan data yang terdaftar.'],
                ],
            ], 422);
        }

        $token = $user->createToken('taskflow-auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Berhasil masuk ke ruang kerja.',
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    /**
     * AKUN DEMO CEPAT (Untuk Penguji Sidang UKK):
     * Otomatis membuat / mengambil akun demo beserta 7 contoh tugas UKK agar penguji
     * dapat langsung mengeksplorasi aplikasi dalam satu klik tanpa registrasi manual.
     */
    public function demoLogin(): JsonResponse
    {
        $demoEmail = 'ahmad.fauzan@smkn-pplg.sch.id';

        // Associative Array untuk firstOrCreate
        $user = User::firstOrCreate(
            ['email' => $demoEmail],
            [
                'name' => 'Ahmad Fauzan',
                'password' => 'ukk2026',
                'role' => 'Siswa XII PPLG 1',
            ]
        );

        // Jika akun demo belum memiliki tugas (misal setelah migrate fresh), isi otomatis data simulasi
        if ($user->tasks()->count() === 0) {
            DemoTaskService::seedForUser($user, false);
        }

        $token = $user->createToken('taskflow-demo-token')->plainTextToken;

        return response()->json([
            'message' => 'Berhasil masuk menggunakan Akun Demo UKK.',
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    /**
     * READ PROFILE:
     * Mengambil data pengguna yang sedang login berdasarkan Bearer Token Sanctum.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * UPDATE PROFILE:
     * Memperbarui nama, peran/kelas, serta avatar pengguna di database MySQL.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        $user->update([
            'name' => $validated['name'],
            'role' => $validated['role'],
            'avatar' => array_key_exists('avatar', $validated) ? $validated['avatar'] : $user->avatar,
        ]);

        return response()->json([
            'message' => 'Profil pengguna berhasil diperbarui.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * LOGOUT:
     * Mencabut (menghapus) token akses Sanctum yang sedang digunakan saat ini.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Anda telah keluar dari sesi dengan aman.',
        ]);
    }
}

