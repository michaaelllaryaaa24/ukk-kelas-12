import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  User as UserIcon,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getNotesApi } from './api/noteApi';
import { getSchedulesApi } from './api/scheduleApi';
import {
  createTaskApi,
  deleteTaskApi,
  getTasksApi,
  seedDemoTasksApi,
  togglePinApi,
  toggleSubtaskApi,
  updateTaskApi,
} from './api/taskApi';
import AuthPage from './components/AuthPage';
import DashboardOverview from './components/DashboardOverview';
import PrintableReport from './components/PrintableReport';
import ScheduleBoard from './components/ScheduleBoard';
import SettingsPage from './components/SettingsPage';
import Sidebar from './components/Sidebar';
import StickyNotesBoard from './components/StickyNotesBoard';
import TaskModal from './components/TaskModal';
import TaskWorkspace from './components/TaskWorkspace';
import { useAuth, useTheme, useToast } from './context/useContexts';
import { extractApiErrorMessage, formatRelativeDeadline } from './utils/formatters';
import {
  isSoundEnabled,
  playCompletionSound,
  playSubtaskSound,
  setSoundEnabled as persistSoundEnabled,
} from './utils/sound';

/**
 * Komponen Utama Aplikasi (`App.jsx`)
 * -----------------------------------
 * Mengatur proteksi rute (Route Protection: Login vs Ruang Kerja Terautentikasi),
 * kerangka editorial berbingkai ala referensi visual, Top Search Capsule terpisah dengan
 * ikon pencarian bulat pink, tombol aksi bulat kanan atas, serta koordinasi CRUD penuh
 * untuk Tugas, Sub-tugas, Jadwal Mingguan (`Schedule`), dan Catatan Bebas (`Sticky Notes`).
 */
function WorkspaceShell() {
  const { user, isAuthenticated, initializing, clearSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [activeNav, setActiveNav] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Array of Objects berisi daftar tugas untuk tampilan aktif (terfilter via backend scopeFilter)
  const [tasks, setTasks] = useState([]);
  // Array of Objects seluruh tugas (untuk Dashboard Overview, Focus Timer, Notifikasi & Cetak Laporan)
  const [allTasks, setAllTasks] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [notesCount, setNotesCount] = useState(0);
  const [schedulesCount, setSchedulesCount] = useState(0);

  // Associative Object berisi statistik metrik & daftar kategori unik
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    today: 0,
    upcoming: 0,
    pinned: 0,
    completion_rate: 0,
    categories: [],
  });

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  useEffect(() => {
    const syncSound = (e) => setSoundOn(Boolean(e.detail));
    window.addEventListener('taskflow:sound-changed', syncSound);
    return () => window.removeEventListener('taskflow:sound-changed', syncSound);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    persistSoundEnabled(next);
    if (next) {
      playCompletionSound(true);
      showToast('Suara notifikasi selesai diaktifkan.', 'info');
    } else {
      showToast('Suara notifikasi dimatikan.', 'info');
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [todayDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    priority: 'all',
    sort: 'newest',
  });

  const buildQueryParams = useCallback((nav, currentFilters) => {
    const params = {
      search: currentFilters.search,
      category: currentFilters.category,
      priority: currentFilters.priority,
      sort: currentFilters.sort,
    };

    if (nav === 'today') params.timeframe = 'today';
    if (nav === 'upcoming') params.timeframe = 'upcoming';
    if (nav === 'pinned') params.pinned = true;
    if (nav === 'completed') params.status = 'completed';

    return params;
  }, []);

  // READ: Mengambil daftar tugas, statistik, jumlah catatan bebas, dan jumlah jadwal
  const fetchTasks = useCallback(
    async (nav = activeNav, currentFilters = filters) => {
      if (!isAuthenticated) return;
      setLoadingTasks(true);
      try {
        const isWorkspaceView = ['all', 'today', 'upcoming', 'pinned', 'completed'].includes(nav);
        const notesPromise = getNotesApi().catch(() => ({ data: [] }));
        const schedulesPromise = getSchedulesApi().catch(() => ({ data: [] }));

        if (isWorkspaceView) {
          const queryParams = buildQueryParams(nav, currentFilters);
          const [filteredRes, allRes, notesRes, schedulesRes] = await Promise.all([
            getTasksApi(queryParams),
            getTasksApi({ sort: 'newest' }),
            notesPromise,
            schedulesPromise,
          ]);
          setTasks(filteredRes.data || []);
          setAllTasks(allRes.data || []);
          if (filteredRes.stats) setStats(filteredRes.stats);
          const nRows = Array.isArray(notesRes?.data) ? notesRes.data : [];
          const sRows = Array.isArray(schedulesRes?.data) ? schedulesRes.data : [];
          setNotesList(nRows);
          setSchedulesList(sRows);
          setNotesCount(nRows.length);
          setSchedulesCount(sRows.length);
        } else {
          const [allRes, notesRes, schedulesRes] = await Promise.all([
            getTasksApi({ sort: 'newest' }),
            notesPromise,
            schedulesPromise,
          ]);
          setAllTasks(allRes.data || []);
          setTasks(allRes.data || []);
          if (allRes.stats) setStats(allRes.stats);
          const nRows = Array.isArray(notesRes?.data) ? notesRes.data : [];
          const sRows = Array.isArray(schedulesRes?.data) ? schedulesRes.data : [];
          setNotesList(nRows);
          setSchedulesList(sRows);
          setNotesCount(nRows.length);
          setSchedulesCount(sRows.length);
        }
      } catch (error) {
        showToast(extractApiErrorMessage(error, 'Gagal memuat daftar tugas.'), 'error');
      } finally {
        setLoadingTasks(false);
      }
    },
    [activeNav, buildQueryParams, filters, isAuthenticated, showToast]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      fetchTasks(activeNav, filters);
    }, 180);
    return () => clearTimeout(timer);
  }, [activeNav, filters, isAuthenticated, fetchTasks]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectNav = (navId) => {
    setActiveNav(navId);
    setNotifOpen(false);
  };

  // Pencarian cepat dari Top Search Capsule
  const handleTopSearchChange = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (
      value.trim() &&
      !['all', 'today', 'upcoming', 'pinned', 'completed', 'schedule'].includes(activeNav)
    ) {
      setActiveNav('all');
    }
  };

  const handleQuickPillFilter = (type, value) => {
    if (type === 'notes') {
      setActiveNav('notes');
      return;
    }
    if (type === 'schedule') {
      setActiveNav('schedule');
      return;
    }
    if (type === 'pinned') {
      setActiveNav('pinned');
      return;
    }
    setFilters((prev) => ({ ...prev, category: value }));
    setActiveNav('all');
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTaskDraft(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setTaskDraft(null);
    setModalOpen(true);
  };

  const handleConvertNoteToTask = (note) => {
    setEditingTask(null);
    setTaskDraft({
      title: note.title || 'Tugas dari Catatan',
      description: note.content || '',
      category: 'Umum',
    });
    setModalOpen(true);
  };

  const handleConvertScheduleToTask = (scheduleItem) => {
    setEditingTask(null);
    setTaskDraft({
      title: scheduleItem.title || 'Tugas dari Jadwal',
      description: [
        scheduleItem.location ? `Lokasi: ${scheduleItem.location}` : '',
        `Waktu: ${scheduleItem.start_time} - ${scheduleItem.end_time}`,
        scheduleItem.notes || '',
      ]
        .filter(Boolean)
        .join('\n'),
      category: scheduleItem.category || 'Agenda UKK',
      due_date: scheduleItem.date || todayDateStr,
    });
    setModalOpen(true);
  };

  const handleSchedulesChange = useCallback((rows) => {
    setSchedulesList(rows);
    setSchedulesCount(rows.length);
  }, []);

  const handleNotesChange = useCallback((rows) => {
    setNotesList(rows);
    setNotesCount(rows.length);
  }, []);

  // CREATE & UPDATE Tugas
  const handleSaveTask = async (payload) => {
    setSavingTask(true);
    try {
      if (editingTask) {
        const res = await updateTaskApi(editingTask.id, payload);
        if (payload.status === 'completed' && editingTask.status !== 'completed') {
          playCompletionSound();
        }
        showToast(res.message || 'Tugas berhasil diperbarui.');
      } else {
        const res = await createTaskApi(payload);
        if (payload.status === 'completed') {
          playCompletionSound();
        }
        showToast(res.message || 'Tugas baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      setEditingTask(null);
      setTaskDraft(null);
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal menyimpan tugas.'), 'error');
    } finally {
      setSavingTask(false);
    }
  };

  // DELETE Tugas
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await deleteTaskApi(taskId);
      showToast(res.message || 'Tugas berhasil dihapus.');
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal menghapus tugas.'), 'error');
    }
  };

  // UPDATE CEPAT Checkbox selesai/to-do
  const handleToggleComplete = async (task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTaskApi(task.id, { status: nextStatus });
      if (nextStatus === 'completed') {
        playCompletionSound();
      }
      showToast(
        nextStatus === 'completed'
          ? `Tugas "${task.title}" ditandai selesai.`
          : `Tugas "${task.title}" dikembalikan ke To Do.`
      );
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memperbarui status tugas.'), 'error');
    }
  };

  // UPDATE CEPAT Pindah kolom di Kanban Board
  const handleMoveStatus = async (task, nextStatus) => {
    try {
      await updateTaskApi(task.id, { status: nextStatus });
      if (nextStatus === 'completed' && task.status !== 'completed') {
        playCompletionSound();
      }
      showToast('Status tugas berhasil dipindahkan.');
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memindahkan status tugas.'), 'error');
    }
  };

  // UPDATE CEPAT Pin
  const handleTogglePin = async (task) => {
    try {
      const res = await togglePinApi(task.id);
      showToast(res.message || 'Status sematan diperbarui.');
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal menyematkan tugas.'), 'error');
    }
  };

  // UPDATE SUBTASK LANGSUNG DI LIST VIEW
  const handleToggleSubtaskInline = async (taskId, subtaskId) => {
    const parentTask = allTasks.find((t) => t.id === taskId);
    const targetSub = parentTask?.subtasks?.find((s) => s.id === subtaskId);
    const willComplete = targetSub ? !targetSub.is_completed : true;
    const remainingUnfinished =
      parentTask?.subtasks?.filter((s) => s.id !== subtaskId && !s.is_completed).length ?? 1;

    try {
      await toggleSubtaskApi(taskId, subtaskId);
      if (willComplete) {
        if (remainingUnfinished === 0) {
          playCompletionSound();
        } else {
          playSubtaskSound();
        }
      }
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memperbarui checklist sub-tugas.'), 'error');
    }
  };

  // SEED DATA SIMULASI UKK
  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const res = await seedDemoTasksApi();
      showToast(res.message || 'Data simulasi UKK berhasil dimuat.');
      await fetchTasks(activeNav, filters);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memuat data simulasi.'), 'error');
    } finally {
      setSeedingDemo(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] p-4 dark:bg-[#0F131D]">
        <div className="w-full max-w-sm rounded-2xl border border-[#E6E0D4] bg-white p-6 text-center shadow-sm dark:border-[#242B3D] dark:bg-[#161B26]">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#141518] border-t-transparent dark:border-[#F1F5F9] dark:border-t-transparent" />
          <p className="font-mono text-sm font-semibold text-[#141518] dark:text-[#F1F5F9]">
            Memverifikasi sesi ruang kerja...
          </p>
          <p className="mt-2 text-xs text-[#71717A] dark:text-[#9DA7BD]">
            Menghubungkan ke server backend (port 8000)...
          </p>
          <button
            type="button"
            onClick={clearSession}
            className="mt-4 inline-block text-xs font-medium text-[#71717A] underline hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white cursor-pointer"
          >
            Masuk ke Halaman Login &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const isTaskWorkspace = ['all', 'today', 'upcoming', 'pinned', 'completed'].includes(activeNav);
  const urgentNotifications = allTasks.filter(
    (t) => t.status !== 'completed' && (t.is_overdue || t.due_date === todayDateStr)
  );

  return (
    <div className="min-h-screen bg-[#F3EFE5] p-2 text-[#141518] sm:p-3 dark:bg-[#080B12] dark:text-[#F1F5F9]">
      {/* Bingkai Luar Ruang Kerja Bergaya Referensi */}
      <div className="no-print mx-auto flex min-h-[calc(100vh-16px)] max-w-[1440px] gap-4 rounded-[26px] border border-[#2B2923]/30 bg-[#FAF7F0] p-2.5 shadow-xs sm:min-h-[calc(100vh-24px)] sm:p-3.5 dark:border-[#22283A] dark:bg-[#0F131D] dark:shadow-2xl dark:shadow-black/40">
        {/* Floating Black Obsidian Sidebar */}
        <Sidebar
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          stats={stats}
          notesCount={notesCount}
          schedulesCount={schedulesCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Area Konten Utama */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#D7D1C5] bg-white px-3.5 text-xs font-semibold text-[#141518] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#F1F5F9]"
              >
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </button>
            </div>

            {/* Ikon Cari Bulat + Kapsul Input Pencarian */}
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5">
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4B8DC] text-[#141518] sm:flex dark:border dark:border-[#2D4268] dark:bg-[#1A253B] dark:text-[#93C5FD]">
                <Search className="h-4 w-4" />
              </span>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#CFC9BC] bg-transparent py-1.5 pl-4 pr-2.5 transition-colors focus-within:border-[#141518] focus-within:bg-white dark:border-[#242B3D] dark:bg-[#161B26]/85 dark:focus-within:border-[#60A5FA] dark:focus-within:bg-[#161B26]">
                <input
                  type="search"
                  value={filters.search}
                  onChange={(e) => handleTopSearchChange(e.target.value)}
                  placeholder="Cari tugas, jadwal, atau catatan..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-[#141518] placeholder-[#71717A] focus:outline-none dark:text-[#F1F5F9] dark:placeholder-[#7B859C]"
                />

                {filters.search && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('search', '')}
                    className="rounded-full p-1 text-[#71717A] hover:bg-[#EFECE4] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Quick Filter Pills (`In:` -> `Di:`) */}
                <div className="hidden items-center gap-1 border-l border-[#D7D1C5] pl-2.5 xl:flex dark:border-[#242B3D]">
                  <span className="mr-1 text-[11px] font-medium text-[#71717A] dark:text-[#7B859C]">
                    Di:
                  </span>
                  {[
                    { label: 'Semua', type: 'category', value: 'all' },
                    { label: 'Jadwal', type: 'schedule', value: 'schedule' },
                    { label: 'UKK Backend', type: 'category', value: 'UKK Backend' },
                    { label: 'Penting', type: 'pinned', value: 'pinned' },
                    { label: 'Catatan', type: 'notes', value: 'notes' },
                  ].map((chip) => {
                    const isActiveChip =
                      (chip.type === 'notes' && activeNav === 'notes') ||
                      (chip.type === 'schedule' && activeNav === 'schedule') ||
                      (chip.type === 'pinned' && activeNav === 'pinned') ||
                      (chip.type === 'category' &&
                        activeNav === 'all' &&
                        filters.category === chip.value);

                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleQuickPillFilter(chip.type, chip.value)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                          isActiveChip
                            ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                            : 'border border-dashed border-[#C7C0B2] text-[#52525B] hover:border-[#141518] hover:text-[#141518] dark:border-[#2D354A] dark:text-[#9DA7BD] dark:hover:border-[#4B587A] dark:hover:text-[#F1F5F9]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tombol Ikon Bulat Kanan Atas (Suara, Tema, Profil, Notifikasi, Pengaturan) */}
            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSound}
                title={soundOn ? 'Suara notifikasi selesai aktif (klik untuk bisukan)' : 'Suara notifikasi dibisukan (klik untuk aktifkan)'}
                aria-label="Toggle suara notifikasi"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CFC9BC] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-[#71717A] dark:text-[#7B859C]" />}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
                aria-label="Ganti tema tampilan"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CFC9BC] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#FCD34D] dark:hover:bg-[#1F2636]"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectNav('settings')}
                title={`Profil: ${user?.name || 'Pengguna'}`}
                aria-label="Profil Pengguna"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111214] text-white transition-all hover:opacity-85 dark:border dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <UserIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                title="Pengingat tugas hari ini & terlambat"
                aria-label="Notifikasi tugas mendesak"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#111214] text-white transition-all hover:opacity-85 dark:border dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <Bell className="h-4 w-4" />
                {urgentNotifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F4B8DC] ring-2 ring-[#111214] dark:bg-[#93C5FD] dark:ring-[#161B26]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectNav('settings')}
                title="Buka Pengaturan"
                aria-label="Pengaturan"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111214] text-white transition-all hover:opacity-85 dark:border dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#624CE0] px-3 text-xs font-semibold text-white sm:hidden dark:bg-[#93C5FD] dark:text-[#0F131D]"
                aria-label="Tambah Tugas"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Popover Notifikasi */}
              {notifOpen && (
                <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-lg dark:border-[#252C3F] dark:bg-[#161B26] dark:shadow-2xl dark:shadow-black/50">
                  <div className="flex items-center justify-between border-b border-[#EFECE4] pb-2.5 dark:border-[#242B3D]">
                    <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                      Pengingat Jatuh Tempo ({urgentNotifications.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="rounded-full p-1 text-[#71717A] hover:bg-[#EFECE4] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {urgentNotifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                      Semua tugas hari ini dan tenggat lewat sudah selesai.
                    </p>
                  ) : (
                    <ul className="mt-2.5 max-h-64 space-y-2 overflow-y-auto">
                      {urgentNotifications.map((item) => {
                        const dl = formatRelativeDeadline(item.due_date, item.status);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                handleOpenEdit(item);
                              }}
                              className="w-full rounded-xl border border-[#EFECE4] bg-[#FAF7F0] p-2.5 text-left transition-colors hover:border-[#141518]/30 dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                            >
                              <p className="truncate text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                                {item.title}
                              </p>
                              <p
                                className={`mt-0.5 font-mono text-[10px] ${
                                  dl.isOverdue
                                    ? 'font-semibold text-rose-600 dark:text-rose-400'
                                    : 'text-[#624CE0] dark:text-[#93C5FD]'
                                }`}
                              >
                                {dl.text}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Area Konten Halaman Aktif */}
          <main className="mx-auto w-full max-w-6xl flex-1 pb-4">
            {activeNav === 'overview' && (
              <DashboardOverview
                tasks={allTasks}
                schedules={schedulesList}
                notes={notesList}
                stats={stats}
                onOpenCreate={handleOpenCreate}
                onEditTask={handleOpenEdit}
                onToggleComplete={handleToggleComplete}
                onNavigate={handleSelectNav}
                onRefresh={() => fetchTasks(activeNav, filters)}
                onSeedDemo={handleSeedDemo}
              />
            )}

            {activeNav === 'schedule' && (
              <ScheduleBoard
                tasks={allTasks}
                searchQuery={filters.search}
                onOpenNotes={() => handleSelectNav('notes')}
                onEditTask={handleOpenEdit}
                onConvertScheduleToTask={handleConvertScheduleToTask}
                onSchedulesChange={handleSchedulesChange}
              />
            )}

            {isTaskWorkspace && (
              <TaskWorkspace
                activeNav={activeNav}
                tasks={tasks}
                allTasksCount={stats.total}
                loading={loadingTasks}
                filters={filters}
                onFilterChange={handleFilterChange}
                availableCategories={stats.categories || []}
                onOpenCreate={handleOpenCreate}
                onEditTask={handleOpenEdit}
                onDeleteTask={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onTogglePin={handleTogglePin}
                onToggleSubtask={handleToggleSubtaskInline}
                onMoveStatus={handleMoveStatus}
                onSeedDemo={handleSeedDemo}
              />
            )}

            {activeNav === 'notes' && (
              <StickyNotesBoard
                onConvertToTask={handleConvertNoteToTask}
                onNotesCountChange={setNotesCount}
                onNotesChange={handleNotesChange}
              />
            )}

            {activeNav === 'settings' && (
              <SettingsPage
                key={`${user?.id}-${user?.name}-${user?.role}-${user?.avatar || ''}`}
                tasks={allTasks}
                onSeedDemo={handleSeedDemo}
                seeding={seedingDemo}
              />
            )}
          </main>
        </div>
      </div>

      {/* Modal Tambah & Edit Tugas + Sub-tugas */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
          setTaskDraft(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        initialDraft={taskDraft}
        availableCategories={stats.categories || []}
        saving={savingTask}
      />

      {/* Komponen Cetak Laporan */}
      <PrintableReport tasks={allTasks} stats={stats} />
    </div>
  );
}

export default function App() {
  return <WorkspaceShell />;
}
