import axiosClient from './axiosClient';

/**
 * Modul API Manajemen Tugas (`taskApi.js`)
 * ----------------------------------------
 * Berisi seluruh fungsi komunikasi HTTP (CRUD: Create, Read, Update, Delete)
 * antara antarmuka React dengan `TaskController` di backend Laravel 11.
 */

/**
 * READ (Mengambil Daftar Tugas & Statistik):
 * Mengirimkan parameter filter (Associative Object) sebagai Query String ke `GET /api/tasks`.
 * Backend mengembalikan Array of Objects `data` (daftar tugas beserta `subtasks`) dan objek `stats`.
 *
 * @param {Record<string, string | boolean | undefined>} params
 */
export async function getTasksApi(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== 'all')
  );
  const { data } = await axiosClient.get('/tasks', { params: cleanParams });
  return data;
}

/**
 * CREATE (Membuat Tugas Baru + Sub-tugas):
 * Mengirim payload objek tugas beserta Array of Objects `subtasks` ke `POST /api/tasks`.
 */
export async function createTaskApi(payload) {
  const { data } = await axiosClient.post('/tasks', payload);
  return data;
}

/**
 * READ SINGLE (Mengambil Detail Satu Tugas):
 * Mengambil satu entitas tugas beserta relasi `subtasks` berdasarkan ID (`GET /api/tasks/:id`).
 */
export async function getTaskDetailApi(taskId) {
  const { data } = await axiosClient.get(`/tasks/${taskId}`);
  return data;
}

/**
 * UPDATE (Memperbarui Tugas / Pindah Kolom Kanban / Sinkronisasi Sub-tugas):
 * Mengirim data perubahan ke `PUT /api/tasks/:id`.
 */
export async function updateTaskApi(taskId, payload) {
  const { data } = await axiosClient.put(`/tasks/${taskId}`, payload);
  return data;
}

/**
 * DELETE (Menghapus Tugas):
 * Menghapus tugas secara permanen beserta seluruh sub-tugas terkait (`DELETE /api/tasks/:id`).
 */
export async function deleteTaskApi(taskId) {
  const { data } = await axiosClient.delete(`/tasks/${taskId}`);
  return data;
}

/**
 * UPDATE CEPAT (Toggle Pin / Tandai Penting):
 * Menyematkan atau melepas sematan prioritas pada tugas (`PATCH /api/tasks/:id/pin`).
 */
export async function togglePinApi(taskId) {
  const { data } = await axiosClient.patch(`/tasks/${taskId}/pin`);
  return data;
}

/**
 * CREATE SUBTASK:
 * Menambahkan item checklist baru ke dalam tugas tertentu (`POST /api/tasks/:id/subtasks`).
 */
export async function addSubtaskApi(taskId, title) {
  const { data } = await axiosClient.post(`/tasks/${taskId}/subtasks`, { title });
  return data;
}

/**
 * UPDATE SUBTASK (Toggle Checklist):
 * Mengubah status selesai/belum selesai satu item sub-tugas (`PATCH /api/tasks/:id/subtasks/:subId/toggle`).
 */
export async function toggleSubtaskApi(taskId, subtaskId) {
  const { data } = await axiosClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
  return data;
}

/**
 * DELETE SUBTASK:
 * Menghapus satu item sub-tugas dari database (`DELETE /api/tasks/:id/subtasks/:subId`).
 */
export async function deleteSubtaskApi(taskId, subtaskId) {
  const { data } = await axiosClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
  return data;
}

/**
 * SEED DATA SIMULASI UKK:
 * Mengisi ulang 7 tugas realistis bertema UKK PPLG/RPL untuk akun yang sedang login (`POST /api/tasks/seed-demo`).
 */
export async function seedDemoTasksApi() {
  const { data } = await axiosClient.post('/tasks/seed-demo');
  return data;
}

