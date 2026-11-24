import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  Moon,
  Printer,
  RefreshCw,
  Save,
  Sun,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth, useTheme, useToast } from '../context/useContexts';
import {
  AVATAR_PRESETS,
  exportTasksToCsv,
  extractApiErrorMessage,
} from '../utils/formatters';
import {
  isSoundEnabled,
  playCompletionSound,
  setSoundEnabled as persistSoundEnabled,
} from '../utils/sound';
import UserAvatar from './UserAvatar';

export default function SettingsPage({ tasks, onSeedDemo, seeding }) {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Siswa XII PPLG');
  const [avatar, setAvatar] = useState(user?.avatar || 'preset:cobalt');
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  useEffect(() => {
    const sync = (e) => setSoundEnabledState(Boolean(e.detail));
    window.addEventListener('taskflow:sound-changed', sync);
    return () => window.removeEventListener('taskflow:sound-changed', sync);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    persistSoundEnabled(next);
    if (next) {
      playCompletionSound(true);
      showToast('Suara notifikasi selesai diaktifkan.');
    } else {
      showToast('Suara notifikasi dimatikan.', 'info');
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Berkas harus berupa gambar (PNG, JPG, atau WEBP).', 'error');
      return;
    }

    if (file.size > 1500 * 1024) {
      showToast('Ukuran foto maksimal 1,5 MB agar penyimpanan tetap ringan.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Nama lengkap minimal terdiri dari 2 karakter.', 'error');
      return;
    }
    if (role.trim().length < 2) {
      showToast('Peran atau kelas wajib diisi.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        role: role.trim(),
        avatar,
      });
      showToast('Profil dan avatar berhasil disimpan ke database MySQL.');
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memperbarui profil.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTriggerSeed = async () => {
    setConfirmSeed(false);
    await onSeedDemo();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#141518] dark:text-[#F1F5F9]">
          Pengaturan & Profil
        </h1>
        <p className="mt-1 text-sm text-[#52525B] dark:text-[#9DA7BD]">
          Kelola identitas pengguna, preferensi tema tampilan, serta data simulasi & ekspor UKK.
        </p>
      </div>

      {/* Bagian 1: Profil Pengguna */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[#E6E0D4] bg-white p-6 dark:border-[#242B3D] dark:bg-[#161B26]"
      >
        <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
          Identitas & Avatar Pengguna
        </h2>
        <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#9DA7BD]">
          Informasi ini akan ditampilkan pada sidebar ruang kerja dan kepala laporan cetak UKK.
        </p>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar user={{ name, avatar }} size="lg" />

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:hover:bg-[#1F2636]">
                <Upload className="h-3.5 w-3.5" />
                <span>Unggah Foto (Base64)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>

              <span className="text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                atau pilih warna inisial:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatar(preset.id)}
                  title={preset.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-mono font-semibold transition-transform ${
                    preset.bgClass
                  } ${
                    avatar === preset.id
                      ? 'ring-2 ring-[#141518] ring-offset-2 dark:ring-[#93C5FD] dark:ring-offset-[#161B26]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {name ? name.slice(0, 2).toUpperCase() : 'TF'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
              Kelas / Jabatan
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Contoh: Siswa XII PPLG 1"
              className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
              Alamat Email (Terdaftar)
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#E6E0D4] bg-[#F2EFE6] px-3.5 py-2 font-mono text-xs text-[#71717A] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#9DA7BD]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-full bg-[#141518] px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </div>
      </form>

      {/* Bagian 2: Preferensi Tampilan */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-white p-6 dark:border-[#242B3D] dark:bg-[#161B26]">
        <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
          Tema Antarmuka
        </h2>
        <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#9DA7BD]">
          Pilih mode tampilan yang nyaman. Pengaturan tersimpan otomatis di browser Anda.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              theme === 'light'
                ? 'border-[#141518] bg-[#FAF7F0]'
                : 'border-[#E6E0D4] hover:bg-[#FAF7F0] dark:border-[#242B3D] dark:bg-[#10141E] dark:hover:bg-[#1B2230]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FBE67B] text-[#141518]">
                <Sun className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Light Mode (Warm Cream)
                </p>
                <p className="font-mono text-[11px] text-[#71717A] dark:text-[#9DA7BD]">#FAF7F0 / #141518</p>
              </div>
            </div>
            {theme === 'light' && (
              <span className="rounded-full bg-[#141518] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                Aktif
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              theme === 'dark'
                ? 'border-[#93C5FD] bg-[#1A2233]'
                : 'border-[#E6E0D4] hover:bg-[#FAF7F0] dark:border-[#242B3D] dark:hover:bg-[#1B2230]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#233252] text-[#93C5FD]">
                <Moon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Dark Mode (Midnight Slate)
                </p>
                <p className="font-mono text-[11px] text-[#71717A] dark:text-[#9DA7BD]">#0F131D / #161B26</p>
              </div>
            </div>
            {theme === 'dark' && (
              <span className="rounded-full bg-[#93C5FD] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#0F131D]">
                Aktif
              </span>
            )}
          </button>
        </div>

        {/* Kontrol Suara Notifikasi Selesai */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#E6E0D4] bg-[#FAF7F0] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#242B3D] dark:bg-[#10141E]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#141518] dark:border dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#93C5FD]">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-[#71717A] dark:text-[#7B859C]" />}
            </span>
            <div>
              <p className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                Suara Notifikasi Saat Selesai
              </p>
              <p className="text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                Memutar suara detik timer Pomodoro dan nada chime saat tugas, sub-tugas, jadwal, atau timer selesai.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playCompletionSound(true)}
              className="rounded-full border border-[#E6E0D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#141518] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
            >
              Uji Suara
            </button>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                soundEnabled
                  ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                  : 'border border-[#E6E0D4] bg-white text-[#71717A] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD]'
              }`}
            >
              {soundEnabled ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>
      </div>

      {/* Bagian 3: Ekspor Laporan & Data Simulasi UKK */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-white p-6 dark:border-[#242B3D] dark:bg-[#161B26]">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#624CE0] dark:text-[#93C5FD]" />
          <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
            Ekspor Laporan & Data Simulasi UKK
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#71717A] dark:text-[#9DA7BD]">
          Unduh rekapitulasi tugas untuk lampiran penguji atau muat ulang 7 contoh tugas beserta
          catatan tempel khusus untuk akun Anda.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => exportTasksToCsv(tasks, user)}
            disabled={tasks.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] disabled:opacity-50 dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh Rekap Tugas (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Laporan PDF / Kertas</span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[#E6E0D4] bg-[#FAF7F0] p-4 dark:border-[#242B3D] dark:bg-[#10141E]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                Muat Ulang Data Simulasi UKK
              </p>
              <p className="mt-0.5 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                Mengganti daftar tugas & papan catatan dengan data simulasi PPLG lengkap.
              </p>
            </div>

            {confirmSeed ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerSeed}
                  disabled={seeding}
                  className="rounded-full bg-[#141518] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60 dark:bg-[#93C5FD] dark:text-[#0F131D]"
                >
                  {seeding ? 'Memuat...' : 'Ya, Muat Ulang'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSeed(false)}
                  className="rounded-full border border-[#E6E0D4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#52525B] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636]"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSeed(true)}
                disabled={seeding}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E6E0D4] bg-white px-4 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] disabled:opacity-60 dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${seeding ? 'animate-spin' : ''}`} />
                <span>Muat Ulang Data Simulasi UKK</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
