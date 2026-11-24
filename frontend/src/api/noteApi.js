import axiosClient from './axiosClient';

/**
 * Modul API Papan Catatan Bebas (`noteApi.js`)
 * --------------------------------------------
 * Mengelola komunikasi CRUD untuk fitur Sticky Notes yang tersimpan di tabel `sticky_notes` MySQL.
 */

export async function getNotesApi() {
  const { data } = await axiosClient.get('/notes');
  return data;
}

export async function createNoteApi(payload) {
  const { data } = await axiosClient.post('/notes', payload);
  return data;
}

export async function updateNoteApi(noteId, payload) {
  const { data } = await axiosClient.put(`/notes/${noteId}`, payload);
  return data;
}

export async function deleteNoteApi(noteId) {
  const { data } = await axiosClient.delete(`/notes/${noteId}`);
  return data;
}

export async function clearNotesApi() {
  const { data } = await axiosClient.delete('/notes');
  return data;
}

