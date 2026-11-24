import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Layers,
  Moon,
  Pause,
  Play,
  Sparkles,
  StickyNote,
  Sun,
  Timer,
} from 'lucide-react';
import { useAuth, useTheme, useToast } from '../context/useContexts';
import { extractApiErrorMessage } from '../utils/formatters';
import {
  playTimerCompleteSound,
  playTimerTickSound,
  unlockAudioContext,
} from '../utils/sound';

const PREVIEW_NOTE_COLORS = {
  yellow: {
    bg: 'bg-[#FCF5CC] border-[#EDE096] text-[#3B2E06] dark:bg-[#2A2310] dark:border-[#524520] dark:text-[#FFF7D6]',
    dot: 'bg-[#EAB308]',
  },
  purple: {
    bg: 'bg-[#F4F0FC] border-[#D8CEF5] text-[#1E1B4B] dark:bg-[#1F1932] dark:border-[#3D3161] dark:text-[#ECE6FF]',
    dot: 'bg-[#8B5CF6]',
  },
  mint: {
    bg: 'bg-[#E5F6DF] border-[#BCE2AA] text-[#17401E] dark:bg-[#19281D] dark:border-[#2C4733] dark:text-[#DCF5DC]',
    dot: 'bg-[#22C55E]',
  },
  blue: {
    bg: 'bg-[#EDF5FE] border-[#C9DDF5] text-[#1E293B] dark:bg-[#162030] dark:border-[#2B3E5E] dark:text-[#E2ECFF]',
    dot: 'bg-[#60A5FA]',
  },
};

export default function AuthPage() {
  const { login, register, loginDemo } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // State interaktif preview di panel kanan (checklist, sticky note color, & mini timer)
  const [previewChecks, setPreviewChecks] = useState([true, true, false]);
  const [previewNoteColor, setPreviewNoteColor] = useState('yellow');
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewSecs, setPreviewSecs] = useState(25 * 60);
  const previewSecsRef = useRef(25 * 60);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'Siswa XII PPLG',
  });

  useEffect(() => {
    if (!previewRunning) return undefined;
    const id = setInterval(() => {
      const next = previewSecsRef.current <= 1 ? 25 * 60 : previewSecsRef.current - 1;
      if (previewSecsRef.current <= 1) {
        playTimerCompleteSound();
      } else {
        playTimerTickSound(next % 2 === 1);
      }
      previewSecsRef.current = next;
      setPreviewSecs(next);
    }, 1000);
    return () => clearInterval(id);
  }, [previewRunning]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (generalError) setGeneralError('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setGeneralError('');
  };

  const validateClient = () => {
    const errors = {};
    if (mode === 'register' && form.name.trim().length < 2) {
      errors.name = 'Nama lengkap minimal 2 karakter.';
    }
    if (!form.email.trim()) {
      errors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Format alamat email tidak valid.';
    }
    if (!form.password) {
      errors.password = 'Kata sandi wajib diisi.';
    } else if (form.password.length < 6) {
      errors.password = 'Kata sandi minimal terdiri dari 6 karakter.';
    }
    if (mode === 'register' && form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Konfirmasi kata sandi tidak cocok.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateClient()) return;

    setSubmitting(true);
    setGeneralError('');
    try {
      if (mode === 'login') {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
        showToast('Berhasil masuk ke ruang kerja TaskFlow.');
      } else {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.password_confirmation,
          role: form.role.trim() || 'Siswa XII PPLG',
        });
        showToast('Akun baru berhasil dibuat. Selamat bekerja!');
      }
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) {
        const mapped = {};
        for (const [key, messages] of Object.entries(serverErrors)) {
          mapped[key] = Array.isArray(messages) ? messages[0] : messages;
        }
        setFieldErrors(mapped);
      }
      const message = extractApiErrorMessage(error, 'Gagal memproses permintaan autentikasi.');
      setGeneralError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    setGeneralError('');
    try {
      await loginDemo();
      showToast('Masuk menggunakan Akun Demo UKK beserta 7 contoh tugas & jadwal.');
    } catch (error) {
      const message = extractApiErrorMessage(error, 'Gagal masuk dengan akun demo.');
      setGeneralError(message);
      showToast(message, 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    switchMode('login');
    setForm((prev) => ({
      ...prev,
      email: 'ahmad.fauzan@smkn-pplg.sch.id',
      password: 'ukk2026',
    }));
  };

  const togglePreviewCheck = (idx) => {
    setPreviewChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const previewCompletedCount = previewChecks.filter(Boolean).length;
  const previewProgressPct = Math.round((previewCompletedCount / previewChecks.length) * 100);
  const noteStyle = PREVIEW_NOTE_COLORS[previewNoteColor] || PREVIEW_NOTE_COLORS.yellow;
  const timerMins = String(Math.floor(previewSecs / 60)).padStart(2, '0');
  const timerSecs = String(previewSecs % 60).padStart(2, '0');

  const inputClass =
    'w-full rounded-2xl border border-[#E6E0D4] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#141518] placeholder-[#9CA0AC] transition-colors focus:border-[#3B82F6] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:placeholder-[#6B768F] dark:focus:border-[#93C5FD] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#FAF7F0] [&:-webkit-autofill]:[-webkit-text-fill-color:#141518] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#10141E] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F1F5F9]';

  return (
    <div className="min-h-screen bg-[#F3EFE5] p-2 text-[#141518] sm:p-3 dark:bg-[#080B12] dark:text-[#F1F5F9]">
      {/* Bingkai Utama Cerah & Modern (Senada Light/Dark Mode dengan Dashboard) */}
      <div className="mx-auto grid min-h-[calc(100vh-16px)] max-w-[1440px] gap-4 rounded-[26px] border border-[#2B2923]/25 bg-[#FAF7F0] p-2.5 shadow-xs sm:min-h-[calc(100vh-24px)] sm:p-3.5 dark:border-[#22283A] dark:bg-[#0F131D] dark:shadow-2xl dark:shadow-black/40 lg:grid-cols-12">
        {/* Panel Kiri: Kartu Putih Cerah (Mode Terang) / Midnight Obsidian (Mode Malam) */}
        <div className="flex flex-col justify-between rounded-[24px] border border-[#E6E0D4] bg-white p-6 shadow-2xs sm:p-8 lg:col-span-5 dark:border-[#242B3D] dark:bg-[#161B26]">
          {/* Header Brand + Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141518] text-white dark:border dark:border-[#2E3240] dark:bg-[#22252F]">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-bold leading-none tracking-tight text-[#141518] dark:text-white">
                  taskflow
                </span>
                <span className="ml-2 rounded-full border border-[#B8D0FB] bg-[#E8F0FE] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#1D3B7A] dark:border-[#2C4066] dark:bg-[#1A253B] dark:text-[#A9C5FF]">
                  UKK PPLG
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
              aria-label="Ganti tema tampilan"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:hover:bg-[#1F2636]"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#FCD34D]" />
                  <span>Terang</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#141518]" />
                  <span>Malam</span>
                </>
              )}
            </button>
          </div>

          {/* Form Autentikasi */}
          <div className="mx-auto my-7 w-full max-w-[395px]">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-1 text-[11px] font-semibold text-[#52525B] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#9DA7BD]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4F9E65]" />
                <span>{mode === 'login' ? 'Siap produktif bareng hari ini' : 'Bikin akun gratis'}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#141518] sm:text-3xl dark:text-[#F8FAFC]">
                {mode === 'login' ? 'Masuk ke Workspace.' : 'Gabung TaskFlow.'}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-[#71717A] dark:text-[#9DA7BD]">
                {mode === 'login'
                  ? 'Semua tugas UKK, jadwal mingguan, timer fokus, dan sticky notes tersimpan rapi di satu tempat.'
                  : 'Atur deadline proyek sekolah tanpa pusing dan tampil rapi saat presentasi sidang.'}
              </p>
            </div>

            {/* Tab Switcher Pill */}
            <div className="mb-5 grid grid-cols-2 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] p-1 dark:border-[#242B3D] dark:bg-[#10141E]">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-full py-1.5 text-xs font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-[#141518] text-white shadow-2xs dark:bg-[#93C5FD] dark:text-[#0F131D]'
                    : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-full py-1.5 text-xs font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-[#141518] text-white shadow-2xs dark:bg-[#93C5FD] dark:text-[#0F131D]'
                    : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            {generalError && (
              <div className="mb-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {mode === 'register' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#D4D4D8]">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Ahmad Fauzan"
                      className={inputClass}
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#D4D4D8]">
                      Kelas / Peran
                    </label>
                    <input
                      type="text"
                      name="role"
                      autoComplete="off"
                      value={form.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      placeholder="Siswa XII PPLG 1"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#D4D4D8]">
                  Alamat Email
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  className={inputClass}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#D4D4D8]">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#141518] dark:text-[#A1A7B5] dark:hover:text-white"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#D4D4D8]">
                    Konfirmasi Kata Sandi
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password_confirmation"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(e) => handleChange('password_confirmation', e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className={inputClass}
                  />
                  {fieldErrors.password_confirmation && (
                    <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                      {fieldErrors.password_confirmation}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#141518] px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#93C5FD] dark:text-[#141518]"
              >
                <span>
                  {submitting
                    ? 'Memproses...'
                    : mode === 'login'
                    ? 'Masuk ke Ruang Kerja'
                    : 'Buat Akun Sekarang'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Bagian Akun Demo Cepat (Biru Periwinkle Pastel & Selaras) */}
            <div className="mt-5 rounded-2xl border border-[#C3D7FC] bg-[#EAF1FF]/75 p-4 dark:border-[#2C4066] dark:bg-[#172133]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8] dark:text-[#93C5FD]" />
                  <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                    Akun Demo Cepat (Sidang UKK)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] font-bold text-[#1D4ED8] hover:underline dark:text-[#93C5FD]"
                >
                  Isi Form
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#52525B] dark:text-[#9DA7BD]">
                1 klik langsung masuk sebagai{' '}
                <span className="font-mono font-semibold text-[#141518] dark:text-[#F1F5F9]">
                  Siswa XII PPLG 1
                </span>{' '}
                lengkap dengan data simulasi tugas & jadwal.
              </p>
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={demoLoading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#B8D0FB] bg-white px-4 py-2 text-xs font-bold text-[#141518] transition-colors hover:bg-[#F5F8FF] disabled:opacity-60 dark:border-[#2E4268] dark:bg-[#161B26] dark:text-[#F1F5F9] dark:hover:bg-[#1D273B]"
              >
                {demoLoading ? 'Menyiapkan ruang kerja...' : 'Masuk Instan dengan Akun Demo'}
              </button>
            </div>
          </div>

          {/* Footer Panel Kiri */}
          <div className="flex items-center justify-between border-t border-[#EFECE4] pt-4 text-[11px] text-[#71717A] dark:border-[#242B3D] dark:text-[#9DA7BD]">
            <span>Ujian Kompetensi Keahlian — PPLG / RPL</span>
            <span className="font-mono">Laravel 11 + MySQL</span>
          </div>
        </div>

        {/* Panel Kanan: Showcase Gen-Z Interaktif di atas Kanvas Titik-Titik Cerah / Dark Mode */}
        <div className="dotted-board-bg hidden flex-col justify-between rounded-[24px] border border-[#E6E0D4] p-6 lg:col-span-7 lg:flex xl:p-8 dark:border-[#242B3D]">
          {/* Top Pills */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E0D4] bg-white py-1.5 pl-2 pr-4 shadow-2xs dark:border-[#242B3D] dark:bg-[#161B26]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F0FE] text-[#1D4ED8] dark:bg-[#1E2B47] dark:text-[#93C5FD]">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                Workspace Produktivitas Gen-Z
              </span>
              <span className="rounded-full bg-[#141518] px-2 py-0.5 font-mono text-[10px] font-semibold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]">
                v2.0
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#52525B] dark:text-[#9DA7BD]">
              <span className="rounded-full border border-[#E6E0D4] bg-white px-3 py-1 dark:border-[#242B3D] dark:bg-[#161B26]">
                Kanban
              </span>
              <span className="rounded-full border border-[#E6E0D4] bg-white px-3 py-1 dark:border-[#242B3D] dark:bg-[#161B26]">
                Jadwal
              </span>
              <span className="rounded-full border border-[#E6E0D4] bg-white px-3 py-1 dark:border-[#242B3D] dark:bg-[#161B26]">
                Sticky Notes
              </span>
            </div>
          </div>

          {/* Hero Copy + Bento Interactive Playground */}
          <div className="my-auto space-y-5 py-4">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#141518] xl:text-4xl dark:text-[#F8FAFC]">
                Atur tugas, jadwal mingguan, & ide visual tanpa ribet.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#52525B] dark:text-[#9DA7BD]">
                Interaktif dari detik pertama—coba klik checklist, nyalakan timer fokus, atau ganti
                warna catatan di bawah sebelum masuk!
              </p>
            </div>

            {/* 4 Kartu Metrik Pastel Signature Dashboard */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[#E4DEC9] bg-[#F2EFE6] p-3.5 transition-transform hover:-translate-y-0.5 dark:border-[#2A3347] dark:bg-[#181E2B]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">
                    Total Tugas
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#141518] dark:bg-[#242C40] dark:text-[#E2E8F0]">
                    <Layers className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#141518] dark:text-[#F8FAFC]">
                  7
                </p>
              </div>

              <div className="rounded-2xl border border-[#C3D7FC] bg-[#E3ECFF] p-3.5 transition-transform hover:-translate-y-0.5 dark:border-[#2A3B61] dark:bg-[#182136]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">
                    Dikerjakan
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#1D4ED8] dark:bg-[#223254] dark:text-[#93C5FD]">
                    <Clock className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#141518] dark:text-[#F8FAFC]">
                  3
                </p>
              </div>

              <div className="rounded-2xl border border-[#BCE2AA] bg-[#DCF3D1] p-3.5 transition-transform hover:-translate-y-0.5 dark:border-[#224234] dark:bg-[#14251D]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">
                    Selesai
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#1F5428] dark:bg-[#1C382B] dark:text-[#86EFAC]">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-[#141518] dark:text-[#F8FAFC]">
                  {previewCompletedCount + 1}
                </p>
              </div>

              <div className="rounded-2xl border border-[#F0D981] bg-[#FEF0B8] p-3.5 transition-transform hover:-translate-y-0.5 dark:border-[#473B20] dark:bg-[#261F13]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">
                    Timer Fokus
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !previewRunning;
                      if (next) {
                        unlockAudioContext();
                        playTimerTickSound(previewSecsRef.current % 2 === 1);
                      }
                      setPreviewRunning(next);
                    }}
                    title={previewRunning ? 'Jeda timer demo' : 'Mulai timer demo'}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#7A5605] transition-transform hover:scale-110 dark:bg-[#382D18] dark:text-[#FCD34D]"
                  >
                    {previewRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                </div>
                <p className="mt-2 flex items-center gap-1.5 font-mono text-2xl font-bold text-[#141518] dark:text-[#F8FAFC]">
                  <span>
                    {timerMins}:{timerSecs}
                  </span>
                </p>
              </div>
            </div>

            {/* Grid Bento Bawah: Checklist Interaktif + Jadwal & Sticky Note */}
            <div className="grid grid-cols-12 gap-3.5">
              {/* Kartu Checklist Interaktif */}
              <div className="col-span-7 rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-2xs dark:border-[#242B3D] dark:bg-[#161B26]">
                <div className="flex items-center justify-between border-b border-[#EFECE4] pb-2.5 dark:border-[#242B3D]">
                  <div>
                    <p className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                      Fokus Hari Ini (Coba Klik!)
                    </p>
                    <p className="text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                      Checklist langsung mengupdate progres real-time
                    </p>
                  </div>
                  <span className="rounded-full bg-[#D5E3FF] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#1D3B7A] dark:border dark:border-[#2C4066] dark:bg-[#1B2842] dark:text-[#93C5FD]">
                    {previewProgressPct}%
                  </span>
                </div>

                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#EFECE4] dark:bg-[#212838]">
                  <div
                    className="h-full rounded-full bg-[#141518] transition-all duration-300 dark:bg-[#93C5FD]"
                    style={{ width: `${previewProgressPct}%` }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    'Migrasi tabel relasi MySQL (cascade)',
                    'REST API Sanctum & Query Scope filter',
                    'Demo Kanban, Jadwal & Sticky Notes',
                  ].map((label, idx) => {
                    const checked = previewChecks[idx];
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => togglePreviewCheck(idx)}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-[#EFECE4] bg-[#FAF7F0] px-3 py-2 text-left text-xs transition-colors hover:border-[#CFC8B8] dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            checked
                              ? 'border-[#141518] bg-[#141518] text-white dark:border-[#93C5FD] dark:bg-[#93C5FD] dark:text-[#0F131D]'
                              : 'border-[#C7BFA9] bg-white dark:border-[#3B4661] dark:bg-[#161B26]'
                          }`}
                        >
                          {checked && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span
                          className={
                            checked
                              ? 'text-[#71717A] line-through dark:text-[#6B768F]'
                              : 'font-medium text-[#141518] dark:text-[#F1F5F9]'
                          }
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kolom Kanan: Mini Jadwal + Sticky Note Playful */}
              <div className="col-span-5 flex flex-col gap-3.5">
                <div className="rounded-2xl border border-[#E6E0D4] border-l-[3px] border-l-[#3B82F6] bg-white p-3.5 shadow-2xs dark:border-[#242B3D] dark:border-l-[#60A5FA] dark:bg-[#161B26]">
                  <div className="flex items-center justify-between text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <CalendarDays className="h-3 w-3" />
                      09:00 - 10:30
                    </span>
                    <span className="rounded-full border border-[#B8D0FB] bg-[#E8F0FE] px-2 py-0.5 font-semibold text-[#1D3B7A] dark:border-[#2C4066] dark:bg-[#1A253B] dark:text-[#A9C5FF]">
                      Berjalan
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                    Simulasi Presentasi UKK
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                    Lab RPL 1 · Seret jadwal antar hari
                  </p>
                </div>

                {/* Sticky Note Interaktif dengan efek paper tilt halus */}
                <div
                  className={`flex flex-1 flex-col justify-between rounded-2xl border p-3.5 shadow-2xs transition-all hover:rotate-0 lg:-rotate-1 ${noteStyle.bg}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                        <StickyNote className="h-3 w-3" />
                        Sticky Note
                      </span>
                      <span className="font-mono text-[10px] opacity-65">Auto-save</span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold">Tempel Ide & Gambar</p>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-85">
                      Drag & drop foto langsung ke catatan, tetap aman tersimpan saat logout.
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[10px] opacity-70">Pilih vibe:</span>
                    <div className="flex items-center gap-1.5">
                      {Object.entries(PREVIEW_NOTE_COLORS).map(([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPreviewNoteColor(key)}
                          aria-label={`Warna ${key}`}
                          className={`h-3 w-3 rounded-full transition-transform ${val.dot} ${
                            previewNoteColor === key
                              ? 'scale-115 ring-2 ring-[#141518]/50 ring-offset-1 dark:ring-white'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Tech Badges */}
          <div className="grid grid-cols-3 gap-4 border-t border-[#E6E0D4] pt-4 dark:border-[#242B3D]">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-[#71717A] dark:text-[#9DA7BD]" />
              <div>
                <p className="font-mono text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Sanctum Auth
                </p>
                <p className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">Token API Aman</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                Kanban + Jadwal
              </p>
              <p className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                Drag & Drop Real-Time
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                Notes + Audio + CSV
              </p>
              <p className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                Siap Sidang Akhir UKK
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
