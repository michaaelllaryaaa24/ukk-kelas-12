import axiosClient from './axiosClient';

/**
 * Modul API Autentikasi & Profil Pengguna
 * ---------------------------------------
 * Menghubungkan form Login, Register, Akun Demo Cepat, Update Profil, dan Logout
 * ke endpoint Laravel Sanctum (`AuthController`).
 */

export async function loginApi(credentials) {
  const { data } = await axiosClient.post('/login', credentials);
  return data;
}

export async function registerApi(payload) {
  const { data } = await axiosClient.post('/register', payload);
  return data;
}

export async function demoLoginApi() {
  const { data } = await axiosClient.post('/demo-login');
  return data;
}

export async function getProfileApi() {
  const { data } = await axiosClient.get('/me');
  return data;
}

export async function updateProfileApi(payload) {
  const { data } = await axiosClient.put('/profile', payload);
  return data;
}

export async function logoutApi() {
  const { data } = await axiosClient.post('/logout');
  return data;
}

