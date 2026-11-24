# TaskFlow — Aplikasi To-Do List & Workspace Productivity (UKK PPLG/RPL)

Aplikasi web fullstack dengan arsitektur **Decoupled Fullstack** (**Laravel 11 REST API + Sanctum** & **React + Vite + Tailwind CSS**), dirancang dengan estetika editorial presisi dan aturan warna **60-30-10**.

---

## Struktur Proyek

```text
├── backend/          # Laravel 11 RESTful API Server (port 8000)
├── frontend/         # React + Vite + Tailwind CSS (port 5173)
├── package.json      # Skrip launcher root (`npm run dev`)
├── start.js          # Launcher Node.js (cek MySQL 3306 + nyalakan Laravel & Vite)
└── run.bat           # Eksekusi 2x klik untuk Windows
```

---

## Panduan Setup Database & Menjalankan Aplikasi

1. **Aktifkan Laragon / XAMPP**
   - Jalankan service **MySQL** di port `3306`.
2. **Buat Database MySQL**
   - Buka HeidiSQL / phpMyAdmin / MySQL CLI, lalu jalankan:
     ```sql
     CREATE DATABASE db_taskflow;
     ```
   - Konfigurasi di `backend/.env` sudah siap pakai (`DB_DATABASE=db_taskflow`, `DB_USERNAME=root`, password kosong).
3. **Jalankan Migrasi Tabel Database**
   - Buka terminal di folder `backend/` lalu jalankan:
     ```bash
     cd backend
     php artisan migrate
     ```
   - *(Opsional)* Jika ingin mengisi akun demo via CLI, jalankan `php artisan db:seed`. Tombol **"Masuk Instan dengan Akun Demo"** di halaman login juga otomatis menyiapkan akun & 7 data simulasi UKK secara langsung.
4. **Nyalakan Aplikasi**
   - Kembali ke folder root, lalu **klik 2x `run.bat`** atau ketik:
     ```bash
     npm run dev
     ```
   - Akses aplikasi di browser: **`http://127.0.0.1:5173`**

---

## Kredensial Akun Demo (Untuk Penguji Sidang UKK)

- **Email:** `ahmad.fauzan@smkn-pplg.sch.id`
- **Kata Sandi:** `ukk2026`
- Atau cukup klik tombol **"Masuk Instan dengan Akun Demo"** pada halaman Login.

