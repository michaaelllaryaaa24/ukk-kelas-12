import axiosClient from './axiosClient';

/**
 * Modul API Jadwal Agenda (`scheduleApi.js`)
 * ------------------------------------------
 * Menghubungkan tampilan Jadwal (Schedule) dengan tabel `schedules` di MySQL melalui Laravel API.
 */

export async function getSchedulesApi(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  );
  const { data } = await axiosClient.get('/schedules', { params: cleanParams });
  return data;
}

export async function createScheduleApi(payload) {
  const { data } = await axiosClient.post('/schedules', payload);
  return data;
}

export async function updateScheduleApi(scheduleId, payload) {
  const { data } = await axiosClient.put(`/schedules/${scheduleId}`, payload);
  return data;
}

export async function deleteScheduleApi(scheduleId) {
  const { data } = await axiosClient.delete(`/schedules/${scheduleId}`);
  return data;
}

export async function seedDemoSchedulesApi() {
  const { data } = await axiosClient.post('/schedules/seed-demo');
  return data;
}

