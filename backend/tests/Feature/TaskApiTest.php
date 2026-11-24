<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_login_and_profile_update_flow(): void
    {
        $registerResponse = $this->postJson('/api/register', [
            'name' => 'Rafi Pratama',
            'email' => 'rafi@smkn-pplg.sch.id',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'role' => 'Siswa XII PPLG 2',
        ]);

        $registerResponse->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);

        $token = $registerResponse->json('token');

        $this->withToken($token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'rafi@smkn-pplg.sch.id');

        $this->withToken($token)
            ->putJson('/api/profile', [
                'name' => 'Rafi Pratama Updated',
                'role' => 'XII PPLG 2 - Ketua Tim',
                'avatar' => 'preset:cobalt',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Rafi Pratama Updated');

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk();
    }

    public function test_demo_login_auto_seeds_tasks_and_supports_full_crud(): void
    {
        $demoResponse = $this->postJson('/api/demo-login');
        $demoResponse->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $token = $demoResponse->json('token');

        $listResponse = $this->withToken($token)->getJson('/api/tasks');
        $listResponse->assertOk()
            ->assertJsonPath('stats.total', 7);

        // Create Task + Subtasks
        $createResponse = $this->withToken($token)->postJson('/api/tasks', [
            'title' => 'Uji Integrasi API CRUD',
            'description' => 'Memastikan endpoint store bekerja dengan subtask.',
            'status' => 'todo',
            'priority' => 'high',
            'category' => 'UKK Backend',
            'due_date' => now()->toDateString(),
            'is_pinned' => true,
            'subtasks' => [
                ['title' => 'Validasi StoreTaskRequest', 'is_completed' => false],
                ['title' => 'Cek JSON TaskResource', 'is_completed' => true],
            ],
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.title', 'Uji Integrasi API CRUD')
            ->assertJsonPath('data.subtask_stats.total', 2)
            ->assertJsonPath('data.subtask_stats.completed', 1);

        $taskId = $createResponse->json('data.id');
        $subtaskId = $createResponse->json('data.subtasks.0.id');

        // Toggle subtask
        $this->withToken($token)
            ->patchJson("/api/tasks/{$taskId}/subtasks/{$subtaskId}/toggle")
            ->assertOk()
            ->assertJsonPath('data.subtask_stats.completed', 2);

        // Toggle pin
        $this->withToken($token)
            ->patchJson("/api/tasks/{$taskId}/pin")
            ->assertOk()
            ->assertJsonPath('data.is_pinned', false);

        // Update status
        $this->withToken($token)
            ->putJson("/api/tasks/{$taskId}", [
                'status' => 'completed',
                'title' => 'Uji Integrasi API CRUD Selesai',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        // Filter search
        $this->withToken($token)
            ->getJson('/api/tasks?search=Integrasi&status=completed')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Delete task (cascade deletes subtasks)
        $this->withToken($token)
            ->deleteJson("/api/tasks/{$taskId}")
            ->assertOk();

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
        $this->assertDatabaseMissing('subtasks', ['id' => $subtaskId]);
    }

    public function test_unauthenticated_api_returns_indonesian_401_and_cross_user_blocked(): void
    {
        $this->getJson('/api/tasks')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Sesi autentikasi berakhir atau tidak valid. Silakan masuk kembali.');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $task = $owner->tasks()->create([
            'title' => 'Tugas Rahasia Pemilik',
            'status' => 'todo',
            'priority' => 'low',
            'category' => 'Umum',
        ]);

        $token = $otherUser->createToken('test')->plainTextToken;
        $this->withToken($token)
            ->getJson("/api/tasks/{$task->id}")
            ->assertStatus(403);
    }

    public function test_sticky_notes_full_crud_and_cascade_links(): void
    {
        $demoResponse = $this->postJson('/api/demo-login');
        $token = $demoResponse->json('token');

        // Demo login auto-seeds 4 starter sticky notes
        $this->withToken($token)
            ->getJson('/api/notes')
            ->assertOk()
            ->assertJsonCount(4, 'data');

        $imgSample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        $note1 = $this->withToken($token)
            ->postJson('/api/notes', [
                'title' => 'Ide Desain',
                'content' => 'Gaya cream editorial + dark sidebar',
                'image_data' => $imgSample,
                'color' => 'pink',
                'pos_x' => 180,
                'pos_y' => 220,
            ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Ide Desain')
            ->assertJsonPath('data.image_data', $imgSample)
            ->json('data');

        $this->withToken($token)
            ->putJson("/api/notes/{$note1['id']}", [
                'title' => 'Ide Desain Final',
                'color' => 'purple',
                'pos_x' => 300,
                'pos_y' => 260,
                'image_data' => $imgSample,
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Ide Desain Final')
            ->assertJsonPath('data.color', 'purple')
            ->assertJsonPath('data.image_data', $imgSample);

        // Logout and login again to verify persistence in DB
        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $reloginToken = $this->postJson('/api/demo-login')->json('token');
        $this->withToken($reloginToken)
            ->getJson('/api/notes')
            ->assertOk()
            ->assertJsonFragment(['id' => $note1['id'], 'image_data' => $imgSample]);

        $this->withToken($reloginToken)
            ->deleteJson("/api/notes/{$note1['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('sticky_notes', ['id' => $note1['id']]);
    }

    public function test_schedules_full_crud_and_mysql_persistence(): void
    {
        $demoResponse = $this->postJson('/api/demo-login');
        $token = $demoResponse->json('token');

        // Demo login auto-seeds 11 weekly schedules
        $this->withToken($token)
            ->getJson('/api/schedules')
            ->assertOk()
            ->assertJsonCount(11, 'data');

        $created = $this->withToken($token)
            ->postJson('/api/schedules', [
                'title' => 'Sidang Uji Kompetensi',
                'location' => 'Lab RPL Utama',
                'category' => 'Ujian',
                'date' => now()->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:30',
                'color' => 'yellow',
                'status' => 'scheduled',
                'participants' => ['AF', 'PG'],
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($token)
            ->putJson("/api/schedules/{$created['id']}", [
                'status' => 'in_progress',
                'color' => 'pink',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.color', 'pink');

        $this->withToken($token)
            ->deleteJson("/api/schedules/{$created['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('schedules', ['id' => $created['id']]);
    }
}

