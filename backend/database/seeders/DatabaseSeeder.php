<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\DemoTaskService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Mengisi database awal dengan akun demo siswa UKK PPLG beserta 7 tugas realistis.
     */
    public function run(): void
    {
        $demoUser = User::firstOrCreate(
            ['email' => 'ahmad.fauzan@smkn-pplg.sch.id'],
            [
                'name' => 'Ahmad Fauzan',
                'password' => 'ukk2026',
                'role' => 'Siswa XII PPLG 1',
            ]
        );

        DemoTaskService::seedForUser($demoUser, true);
    }
}
