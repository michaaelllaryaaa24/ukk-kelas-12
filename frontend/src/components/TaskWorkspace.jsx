import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  Kanban,
  List,
  Pencil,
  Pin,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/useContexts';
import {
  DEFAULT_CATEGORIES,
  exportTasksToCsv,
  formatRelativeDeadline,
  PRIORITY_META,
  STATUS_META,
} from '../utils/formatters';

const VIEW_TITLES = {
  all: {
    title: 'Semua Tugas',
    subtitle: 'Kelola seluruh tugas dalam tampilan Daftar interaktif atau Papan Kanban drag & drop.',
  },
  today: {
    title: 'Tugas Hari Ini',
    subtitle: 'Daftar tugas dengan tenggat waktu tepat pada hari ini.',
  },
  upcoming: {
    title: 'Tugas Mendatang',
    subtitle: 'Rencana pekerjaan dengan tenggat waktu di masa mendatang.',
  },
  pinned: {
    title: 'Tugas Penting (Disematkan)',
    subtitle: 'Tugas prioritas utama yang selalu disematkan di bagian teratas.',
  },
  completed: {
    title: 'Tugas Selesai',
    subtitle: 'Arsip pekerjaan yang telah berhasil diselesaikan.',
  },
};

const KANBAN_COLUMNS = [
  {
    status: 'todo',
    title: 'To Do',
    dotClass: 'bg-[#5B8DEF]',
    columnBg: 'bg-[#F2EFE6]/90 border-[#E6E0D4] dark:bg-[#131824] dark:border-[#242C40]',
    cardAccent: 'bg-[#FFFFFF] dark:bg-[#19202F]',
    countBadge: 'bg-[#D5E3FF] text-[#1D3B7A] dark:bg-[#1B2842] dark:text-[#93C5FD]',
  },
  {
    status: 'in_progress',
    title: 'Sedang Dikerjakan',
    dotClass: 'bg-[#E57CB8] dark:bg-[#A78BFA]',
    columnBg: 'bg-[#FCE5F1]/45 border-[#F3C5DF] dark:bg-[#19172B] dark:border-[#2E2A4D]',
    cardAccent: 'bg-[#FFFFFF] dark:bg-[#201E36]',
    countBadge: 'bg-[#FAD2E8] text-[#702459] dark:bg-[#282452] dark:text-[#C4B5FD]',
  },
  {
    status: 'completed',
    title: 'Selesai',
    dotClass: 'bg-[#4FA963]',
    columnBg: 'bg-[#DCF3D1]/45 border-[#BCE2AA] dark:bg-[#13211A] dark:border-[#223F31]',
    cardAccent: 'bg-[#FFFFFF] dark:bg-[#182920]',
    countBadge: 'bg-[#DCF3D1] text-[#1F5428] dark:bg-[#1B3829] dark:text-[#86EFAC]',
  },
];

export default function TaskWorkspace({
  activeNav,
  tasks,
  allTasksCount,
  loading,
  filters,
  onFilterChange,
  availableCategories,
  onOpenCreate,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onTogglePin,
  onToggleSubtask,
  onMoveStatus,
  onSeedDemo,
}) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const meta = VIEW_TITLES[activeNav] || VIEW_TITLES.all;
  const mergedCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...availableCategories])
  );

  const handleDeleteConfirm = (taskId) => {
    onDeleteTask(taskId);
    setConfirmDeleteId(null);
  };

  const toggleExpandSubtasks = (taskId) => {
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleKanbanDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const idFromTransfer = e.dataTransfer.getData('text/plain');
    const resolvedId = idFromTransfer || draggedTaskId;
    setDraggedTaskId(null);

    if (!resolvedId) return;
    const droppedTask = tasks.find((t) => String(t.id) === String(resolvedId));
    if (droppedTask && droppedTask.status !== targetStatus) {
      onMoveStatus(droppedTask, targetStatus);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Aksi Toolbar Pill */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#141518] dark:text-[#F1F5F9]">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-[#52525B] dark:text-[#9DA7BD]">{meta.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher List vs Kanban */}
          <div className="inline-flex rounded-full border border-[#E6E0D4] bg-white p-1 dark:border-[#242B3D] dark:bg-[#161B26]">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                  : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Daftar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                  : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportTasksToCsv(tasks, user)}
            disabled={tasks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-3.5 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] disabled:opacity-50 dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-3.5 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Pill & Live Search */}
      <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-[#E6E0D4] bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 dark:border-[#242B3D] dark:bg-[#161B26]">
        <div className="relative sm:col-span-2 lg:col-span-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A] dark:text-[#9DA7BD]" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Cari judul, deskripsi, atau kategori tugas..."
            className="w-full rounded-full border border-[#E6E0D4] bg-[#FAF7F0] py-1.5 pl-9 pr-3.5 text-xs text-[#141518] placeholder-[#71717A] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:placeholder-[#7B859C] dark:focus:border-[#60A5FA]"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="w-full rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
            aria-label="Filter kategori"
          >
            <option value="all">Semua Kategori</option>
            {mergedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="w-full rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
            aria-label="Filter prioritas"
          >
            <option value="all">Semua Prioritas</option>
            <option value="high">Prioritas Tinggi</option>
            <option value="medium">Prioritas Sedang</option>
            <option value="low">Prioritas Rendah</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={filters.sort}
            onChange={(e) => onFilterChange('sort', e.target.value)}
            className="w-full rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
            aria-label="Urutkan tugas"
          >
            <option value="newest">Terbaru</option>
            <option value="due_date">Deadline Terdekat</option>
            <option value="priority">Prioritas Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Konten Utama */}
      {loading ? (
        <div className="rounded-2xl border border-[#E6E0D4] bg-white p-12 text-center dark:border-[#242B3D] dark:bg-[#161B26]">
          <p className="font-mono text-xs text-[#71717A] dark:text-[#9DA7BD]">
            Memuat daftar tugas dari server...
          </p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E0D4] bg-white p-12 text-center dark:border-[#242B3D] dark:bg-[#161B26]">
          <p className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
            Tidak ada tugas yang sesuai tampilan ini
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-[#71717A] dark:text-[#9DA7BD]">
            {allTasksCount === 0
              ? 'Ruang kerja Anda masih kosong. Tambahkan tugas baru atau muat data simulasi UKK secara otomatis.'
              : 'Coba ubah kata kunci pencarian, kategori, atau filter prioritas di atas.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Buat Tugas Pertama</span>
            </button>
            {allTasksCount === 0 && onSeedDemo && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#141518] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:hover:bg-[#1F2636]"
              >
                <span>Muat Data Simulasi UKK</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* MODE LIST VIEW INTERAKTIF (DENGAN INLINE EXPAND SUB-TUGAS) */
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const statusMeta = STATUS_META[task.status] || STATUS_META.todo;
            const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
            const deadline = formatRelativeDeadline(task.due_date, task.status);
            const subStats = task.subtask_stats || { total: 0, completed: 0, percentage: 0 };
            const isExpanded = Boolean(expandedTaskIds[task.id]);

            const cardTint = task.is_pinned
              ? 'border-[#F0D981] bg-[#FEF7D6]/65 dark:border-[#473B20] dark:bg-[#221D13]'
              : isCompleted
              ? 'border-[#BCE2AA] bg-[#ECF9E4]/55 dark:border-[#224234] dark:bg-[#13201A]'
              : 'border-[#E6E0D4] bg-white dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#37425D]';

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 transition-all hover:shadow-xs sm:px-5 ${cardTint}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* Checkbox Sekali Klik */}
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isCompleted
                          ? 'border-[#141518] bg-[#141518] text-white dark:border-[#93C5FD] dark:bg-[#93C5FD] dark:text-[#0F131D]'
                          : 'border-[#C7BFA9] bg-white hover:border-[#141518] dark:border-[#3B4661] dark:bg-[#10141E] dark:hover:border-[#93C5FD]'
                      }`}
                      aria-label={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {isCompleted && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.is_pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE67B] px-2 py-0.5 text-[10px] font-bold text-[#5C4104] dark:bg-[#382D18] dark:text-[#FCD34D]">
                            <Pin className="h-2.5 w-2.5" />
                            <span>Penting</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className={`truncate text-left text-sm font-bold transition-colors ${
                            isCompleted
                              ? 'text-[#71717A] line-through dark:text-[#6B768F]'
                              : 'text-[#141518] hover:underline dark:text-[#F1F5F9]'
                          }`}
                        >
                          {task.title}
                        </button>
                      </div>

                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-[#52525B] dark:text-[#9DA7BD]">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-semibold ${priorityMeta.badgeClass}`}
                        >
                          {priorityMeta.label}
                        </span>
                        <span className="rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-0.5 font-medium text-[#52525B] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#CBD5E1]">
                          {task.category || 'Umum'}
                        </span>

                        {task.due_date && (
                          <span
                            className={`inline-flex items-center gap-1 font-mono ${
                              deadline.isOverdue
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : deadline.isToday
                                ? 'font-semibold text-[#624CE0] dark:text-[#93C5FD]'
                                : 'text-[#71717A] dark:text-[#9DA7BD]'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {deadline.text}
                          </span>
                        )}

                        {subStats.total > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandSubtasks(task.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#EFECE4] px-2.5 py-0.5 font-mono font-semibold text-[#141518] transition-colors hover:bg-[#E2DDD0] dark:bg-[#22293B] dark:text-[#E2E7F2] dark:hover:bg-[#2B354D]"
                          >
                            <CheckSquare className="h-3 w-3" />
                            <span>
                              {subStats.completed}/{subStats.total} selesai
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aksi Baris */}
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1">
                        <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                          Hapus?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirm(task.id)}
                          className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                        >
                          Ya
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#52525B] hover:bg-white dark:text-[#A1A7B5] dark:hover:bg-[#1E2129]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onTogglePin(task)}
                          title={task.is_pinned ? 'Lepas sematan' : 'Sematkan tugas'}
                          className={`rounded-full p-2 transition-colors ${
                            task.is_pinned
                              ? 'bg-[#FBE67B]/70 text-[#6B4E08] dark:bg-[#382D18] dark:text-[#FCD34D]'
                              : 'text-[#71717A] hover:bg-[#EFECE4] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white'
                          }`}
                          aria-label="Pin tugas"
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          title="Sunting tugas & sub-tugas"
                          className="rounded-full p-2 text-[#71717A] transition-colors hover:bg-[#EFECE4] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
                          aria-label="Edit tugas"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(task.id)}
                          title="Hapus tugas"
                          className="rounded-full p-2 text-[#71717A] transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:text-[#9DA7BD] dark:hover:text-rose-400"
                          aria-label="Hapus tugas"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Expandable Sub-Tugas Interaktif */}
                {isExpanded && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                  <div className="mt-3 ml-8 space-y-1.5 border-t border-[#E6E0D4]/80 pt-3 dark:border-[#242B3D]">
                    {task.subtasks.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onToggleSubtask && onToggleSubtask(task.id, sub.id)}
                        className="flex w-full items-center gap-2.5 rounded-xl bg-white/80 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white dark:bg-[#10141E] dark:hover:bg-[#1B2230]"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            sub.is_completed
                              ? 'border-[#141518] bg-[#141518] text-white dark:border-[#93C5FD] dark:bg-[#93C5FD] dark:text-[#0F131D]'
                              : 'border-[#C7BFA9] dark:border-[#3B4661]'
                          }`}
                        >
                          {sub.is_completed && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span
                          className={
                            sub.is_completed
                              ? 'text-[#71717A] line-through dark:text-[#6B768F]'
                              : 'font-medium text-[#141518] dark:text-[#F1F5F9]'
                          }
                        >
                          {sub.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE KANBAN BOARD INTERAKTIF (DRAG & DROP + TOMBOL PINDAH CEPAT) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {KANBAN_COLUMNS.map((column) => {
            const colTasks = tasks.filter((t) => t.status === column.status);
            const isOver = dragOverCol === column.status;

            return (
              <div
                key={column.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(column.status);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleKanbanDrop(e, column.status)}
                className={`flex min-h-[380px] flex-col rounded-2xl border p-3.5 transition-all ${
                  column.columnBg
                } ${isOver ? 'ring-2 ring-[#141518]/35 dark:ring-[#93C5FD]/60' : ''}`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.dotClass}`} />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#141518] dark:text-[#F1F5F9]">
                      {column.title}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${column.countBadge}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#C7BFA9] px-3 py-10 text-center text-xs text-[#71717A] dark:border-[#2C354C] dark:text-[#9DA7BD]">
                      Seret tugas ke kolom ini
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                      const deadline = formatRelativeDeadline(task.due_date, task.status);
                      const subStats = task.subtask_stats || {
                        total: 0,
                        completed: 0,
                        percentage: 0,
                      };

                      const prevStatus =
                        column.status === 'completed'
                          ? 'in_progress'
                          : column.status === 'in_progress'
                          ? 'todo'
                          : null;
                      const nextStatus =
                        column.status === 'todo'
                          ? 'in_progress'
                          : column.status === 'in_progress'
                          ? 'completed'
                          : null;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskId(task.id);
                            e.dataTransfer.setData('text/plain', String(task.id));
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverCol(null);
                          }}
                          className={`group cursor-grab rounded-2xl border border-[#E6E0D4] p-3.5 shadow-2xs transition-all hover:shadow-sm active:cursor-grabbing dark:border-[#283147] ${
                            task.is_pinned
                              ? 'bg-[#FEF7D6] dark:border-[#473B20] dark:bg-[#241F13]'
                              : column.cardAccent
                          } ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="h-3.5 w-3.5 text-[#A1A1AA] dark:text-[#6B768F]" />
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.badgeClass}`}
                              >
                                {priorityMeta.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => onTogglePin(task)}
                                className={`rounded-full p-1 transition-opacity ${
                                  task.is_pinned
                                    ? 'bg-[#FBE67B] text-[#6B4E08] opacity-100 dark:bg-[#382D18] dark:text-[#FCD34D]'
                                    : 'text-[#71717A] opacity-0 hover:text-[#141518] group-hover:opacity-100 dark:text-[#9DA7BD] dark:hover:text-white'
                                }`}
                                title="Sematkan tugas"
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="rounded-full p-1 text-[#71717A] opacity-0 transition-opacity hover:text-[#141518] group-hover:opacity-100 dark:text-[#9DA7BD] dark:hover:text-white"
                                title="Edit tugas"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                className="rounded-full p-1 text-[#71717A] opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 dark:text-[#9DA7BD] dark:hover:text-rose-400"
                                title="Hapus tugas"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className={`mt-2 block text-left text-sm font-bold leading-snug ${
                              task.status === 'completed'
                                ? 'text-[#71717A] line-through dark:text-[#6B768F]'
                                : 'text-[#141518] hover:underline dark:text-[#F1F5F9]'
                            }`}
                          >
                            {task.title}
                          </button>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-[#52525B] dark:text-[#9DA7BD]">
                              {task.description}
                            </p>
                          )}

                          {subStats.total > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                                <span>Checklist</span>
                                <span className="font-mono font-semibold">
                                  {subStats.completed}/{subStats.total}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE4] dark:bg-[#212838]">
                                <div
                                  className="h-full rounded-full bg-[#141518] dark:bg-[#93C5FD]"
                                  style={{ width: `${subStats.percentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-[#EFECE4] pt-2.5 text-[11px] dark:border-[#283147]">
                            <span className="truncate font-medium text-[#71717A] dark:text-[#9DA7BD]">
                              {task.category || 'Umum'}
                            </span>
                            {task.due_date && (
                              <span
                                className={`font-mono ${
                                  deadline.isOverdue
                                    ? 'font-semibold text-rose-600 dark:text-rose-400'
                                    : 'text-[#71717A] dark:text-[#9DA7BD]'
                                }`}
                              >
                                {deadline.isToday ? 'Hari Ini' : task.due_date}
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-1.5">
                            {prevStatus ? (
                              <button
                                type="button"
                                onClick={() => onMoveStatus(task, prevStatus)}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-1 text-[11px] font-semibold text-[#52525B] transition-colors hover:bg-[#EFECE4] hover:text-[#141518] dark:border-[#293247] dark:bg-[#10141E] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636] dark:hover:text-white"
                              >
                                <ArrowLeft className="h-3 w-3" />
                                <span>{STATUS_META[prevStatus].label}</span>
                              </button>
                            ) : (
                              <span className="flex-1" />
                            )}

                            {nextStatus ? (
                              <button
                                type="button"
                                onClick={() => onMoveStatus(task, nextStatus)}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#141518] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
                              >
                                <span>{STATUS_META[nextStatus].label}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="flex-1" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
