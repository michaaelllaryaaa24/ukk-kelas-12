import { useCallback, useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GripVertical,
  MapPin,
  MoreHorizontal,
  PenLine,
  Plus,
  RefreshCw,
  Video,
} from 'lucide-react';
import {
  createScheduleApi,
  deleteScheduleApi,
  getSchedulesApi,
  seedDemoSchedulesApi,
  updateScheduleApi,
} from '../api/scheduleApi';
import { useAuth, useToast } from '../context/useContexts';
import {
  extractApiErrorMessage,
  PRIORITY_META,
  STATUS_META,
} from '../utils/formatters';
import { playCompletionSound } from '../utils/sound';
import ScheduleModal from './ScheduleModal';

/**
 * Palet Kartu Jadwal yang Tenang & Editorial (Non-Norak)
 * Menggunakan permukaan bersih + garis aksen kiri 3px yang halus dan ikon monokrom.
 */
const SCHEDULE_ACCENT_STYLES = {
  sand: {
    borderLeft: 'border-l-[#A8A090] dark:border-l-[#6B6E7B]',
    dot: 'bg-[#A8A090]',
  },
  yellow: {
    borderLeft: 'border-l-[#D6AF36] dark:border-l-[#E4C240]',
    dot: 'bg-[#D6AF36]',
  },
  blue: {
    borderLeft: 'border-l-[#5E8BE6] dark:border-l-[#7AA2F7]',
    dot: 'bg-[#5E8BE6]',
  },
  pink: {
    borderLeft: 'border-l-[#D473A7] dark:border-l-[#E589BA]',
    dot: 'bg-[#D473A7]',
  },
  green: {
    borderLeft: 'border-l-[#4F9E65] dark:border-l-[#66BA7E]',
    dot: 'bg-[#4F9E65]',
  },
};

const STATUS_BADGE = {
  scheduled: {
    label: 'Terjadwal',
    cls: 'border-[#E6E0D4] bg-[#FAF7F0] text-[#52525B] hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#9DA7BD] dark:hover:bg-[#1A2132]',
  },
  in_progress: {
    label: 'Berjalan',
    cls: 'border-[#EAB8D5] bg-[#FCE5F1]/70 text-[#702459] hover:bg-[#FCE5F1] dark:border-[#2C4066] dark:bg-[#1A253B] dark:text-[#93C5FD] dark:hover:bg-[#233252]',
  },
  done: {
    label: 'Selesai',
    cls: 'border-[#BCE2AA] bg-[#DCF3D1]/70 text-[#1F5428] hover:bg-[#DCF3D1] dark:border-[#234736] dark:bg-[#152920] dark:text-[#86EFAC] dark:hover:bg-[#1B3829]',
  },
};

const DAY_NAMES_SHORT = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00'];

function toIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayOfWeek(baseDate) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Komponen Jadwal Agenda (`ScheduleBoard.jsx`)
 * --------------------------------------------
 * Mendukung Drag & Drop antar hari (Senin–Minggu), Drag & Drop tugas To-Do langsung
 * ke kalender untuk dijadwalkan, tampilan Harian / Mingguan / Bulanan, serta
 * sinkronisasi penuh dengan tabel `schedules` di database MySQL.
 */
export default function ScheduleBoard({
  tasks = [],
  searchQuery = '',
  onOpenNotes,
  onEditTask,
  onConvertScheduleToTask,
  onSchedulesChange,
}) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'today' | 'week' | 'month' | 'year'
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [todayIso] = useState(() => toIsoDate(new Date()));
  const [selectedDayIso, setSelectedDayIso] = useState(() => toIsoDate(new Date()));
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => new Date().getMonth());

  const [dragPayload, setDragPayload] = useState(null); // { type: 'schedule'|'task', id: number }
  const [dragOverIso, setDragOverIso] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [modalDefaultDate, setModalDefaultDate] = useState('');

  const [nowClock] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  });

  const syncParentSchedules = useCallback(
    (rows) => {
      if (onSchedulesChange && !searchQuery) {
        onSchedulesChange(rows);
      }
    },
    [onSchedulesChange, searchQuery]
  );

  const loadSchedules = useCallback(async () => {
    try {
      const res = await getSchedulesApi({ search: searchQuery });
      const rows = res.data || [];
      setSchedules(rows);
      syncParentSchedules(rows);
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memuat jadwal dari database.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast, syncParentSchedules]);

  useEffect(() => {
    let active = true;
    getSchedulesApi({ search: searchQuery })
      .then((res) => {
        if (!active) return;
        const rows = res.data || [];
        setSchedules(rows);
        syncParentSchedules(rows);
      })
      .catch((error) => {
        if (active) {
          showToast(extractApiErrorMessage(error, 'Gagal memuat jadwal dari database.'), 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, showToast, syncParentSchedules]);

  const monday = getMondayOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d,
      iso: toIsoDate(d),
      dayShort: DAY_NAMES_SHORT[d.getDay()],
      dayMonth: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      isSunday: d.getDay() === 0,
    };
  });

  const weekStartLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(weekDays[0].date);
  const weekEndLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(weekDays[6].date);
  const weekNumber = getIsoWeekNumber(monday);

  const shiftPeriod = (direction) => {
    const next = new Date(anchorDate);
    if (viewMode === 'year') {
      next.setFullYear(next.getFullYear() + direction);
    } else if (viewMode === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else if (viewMode === 'today') {
      next.setDate(next.getDate() + direction);
      setSelectedDayIso(toIsoDate(next));
    } else {
      next.setDate(next.getDate() + direction * 7);
    }
    setAnchorDate(next);
  };

  const handleOpenCreate = (dateIso = selectedDayIso) => {
    setEditingSchedule(null);
    setModalDefaultDate(dateIso || todayIso);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingSchedule(item);
    setModalDefaultDate(item.date);
    setModalOpen(true);
  };

  const handleSaveSchedule = async (payload) => {
    setSaving(true);
    try {
      if (editingSchedule) {
        const res = await updateScheduleApi(editingSchedule.id, payload);
        if (payload.status === 'done' && editingSchedule.status !== 'done') {
          playCompletionSound();
        }
        showToast(res.message || 'Jadwal diperbarui.');
      } else {
        const res = await createScheduleApi(payload);
        if (payload.status === 'done') {
          playCompletionSound();
        }
        showToast(res.message || 'Jadwal baru tersimpan ke MySQL.');
      }
      setModalOpen(false);
      setEditingSchedule(null);
      await loadSchedules();
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal menyimpan jadwal.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      const res = await deleteScheduleApi(scheduleId);
      showToast(res.message || 'Jadwal dihapus.');
      setModalOpen(false);
      setEditingSchedule(null);
      await loadSchedules();
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal menghapus jadwal.'), 'error');
    }
  };

  const handleQuickCycleStatus = async (e, item) => {
    e.stopPropagation();
    const nextStatus =
      item.status === 'scheduled'
        ? 'in_progress'
        : item.status === 'in_progress'
          ? 'done'
          : 'scheduled';
    try {
      await updateScheduleApi(item.id, { status: nextStatus });
      if (nextStatus === 'done') {
        playCompletionSound();
      }
      showToast(
        nextStatus === 'in_progress'
          ? `Agenda "${item.title}" ditandai sedang berjalan.`
          : nextStatus === 'done'
            ? `Agenda "${item.title}" selesai.`
            : `Agenda "${item.title}" dijadwalkan ulang.`
      );
      await loadSchedules();
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal mengubah status agenda.'), 'error');
    }
  };

  const handleSeedDemoSchedules = async () => {
    setLoading(true);
    try {
      const res = await seedDemoSchedulesApi();
      const rows = res.data || [];
      setSchedules(rows);
      syncParentSchedules(rows);
      showToast(res.message || 'Jadwal mingguan simulasi dimuat.');
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal memuat jadwal simulasi.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop Handler pada Kolom Hari (memindahkan Schedule atau menjadwalkan Task)
  const handleDropOnDay = async (e, targetDateIso) => {
    e.preventDefault();
    setDragOverIso(null);

    let payload = dragPayload;
    if (!payload) {
      try {
        const raw =
          e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (raw) payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
    setDragPayload(null);

    if (!payload) return;

    if (payload.type === 'schedule') {
      const movedItem = schedules.find((s) => String(s.id) === String(payload.id));
      if (!movedItem || movedItem.date === targetDateIso) return;

      setSchedules((prev) =>
        prev.map((s) => (s.id === movedItem.id ? { ...s, date: targetDateIso } : s))
      );

      try {
        await updateScheduleApi(movedItem.id, { date: targetDateIso });
        showToast(`"${movedItem.title}" dipindahkan ke ${targetDateIso}.`);
        await loadSchedules();
      } catch (error) {
        showToast(extractApiErrorMessage(error, 'Gagal memindahkan jadwal.'), 'error');
        await loadSchedules();
      }
    } else if (payload.type === 'task') {
      const sourceTask = tasks.find((t) => String(t.id) === String(payload.id));
      if (!sourceTask) return;

      try {
        await createScheduleApi({
          title: sourceTask.title,
          location: sourceTask.category || 'Ruang Kerja',
          category: sourceTask.category || 'Tugas UKK',
          date: targetDateIso,
          start_time: '09:00',
          end_time: '10:00',
          color: sourceTask.priority === 'high' ? 'pink' : 'blue',
          status: sourceTask.status === 'in_progress' ? 'in_progress' : 'scheduled',
          participants: [],
          notes: (sourceTask.description || '').slice(0, 1900),
        });
        showToast(`Tugas "${sourceTask.title}" dijadwalkan pada ${targetDateIso}.`);
        await loadSchedules();
      } catch (error) {
        showToast(extractApiErrorMessage(error, 'Gagal menjadwalkan tugas.'), 'error');
      }
    }
  };

  // Daftar tugas aktif yang bisa di-drag ke kalender untuk dijadwalkan
  const activeTodoTasks = tasks.filter((t) => t.status !== 'completed').slice(0, 8);

  // Bulanan: membangun sel kalender bulan aktif
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthTitle = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(monthStart);
  const monthGridStart = getMondayOfWeek(monthStart);
  const monthCells = Array.from({ length: 35 }, (_, idx) => {
    const d = new Date(monthGridStart);
    d.setDate(monthGridStart.getDate() + idx);
    return {
      date: d,
      iso: toIsoDate(d),
      inCurrentMonth: d.getMonth() === monthStart.getMonth(),
    };
  });

  // Tahunan: Rekap 12 bulan (card per bulan tanpa tanggal/kalender)
  const currentYear = anchorDate.getFullYear();
  const yearSchedules = schedules.filter(
    (s) => s.date && s.date.startsWith(String(currentYear))
  );
  const yearTasks = tasks.filter((t) => {
    if (t.due_date && t.due_date.startsWith(String(currentYear))) return true;
    if (!t.due_date && t.created_at && t.created_at.startsWith(String(currentYear))) return true;
    return false;
  });

  const yearMonthRecap = Array.from({ length: 12 }, (_, m) => {
    const mStr = String(m + 1).padStart(2, '0');
    const monthIsoPrefix = `${currentYear}-${mStr}`;
    const monthName = MONTH_NAMES_ID[m];

    const monthTasks = tasks.filter((t) => {
      if (t.due_date && t.due_date.startsWith(monthIsoPrefix)) return true;
      if (!t.due_date && t.created_at && t.created_at.startsWith(monthIsoPrefix)) return true;
      return false;
    });

    const completedCount = monthTasks.filter((t) => t.status === 'completed').length;
    const inProgressCount = monthTasks.filter((t) => t.status === 'in_progress').length;
    const todoCount = monthTasks.filter((t) => t.status === 'todo').length;
    const totalTasks = monthTasks.length;
    const rate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const monthScheds = schedules.filter(
      (s) => s.date && s.date.startsWith(monthIsoPrefix)
    );

    const isCurrentMonth =
      currentYear === new Date().getFullYear() && m === new Date().getMonth();

    return {
      monthIndex: m,
      monthName,
      monthIsoPrefix,
      tasks: monthTasks,
      totalTasks,
      completedCount,
      inProgressCount,
      todoCount,
      rate,
      scheds: monthScheds,
      isCurrentMonth,
    };
  });

  const activeRecap = yearMonthRecap[selectedYearMonth] || yearMonthRecap[0];

  const handleJumpToMonth = (monthIndex) => {
    const next = new Date(anchorDate);
    next.setMonth(monthIndex);
    setAnchorDate(next);
    setViewMode('month');
  };

  const renderScheduleCard = (item) => {
    const accent = SCHEDULE_ACCENT_STYLES[item.color] || SCHEDULE_ACCENT_STYLES.sand;
    const statusMeta = STATUS_BADGE[item.status] || STATUS_BADGE.scheduled;
    const participants = Array.isArray(item.participants) ? item.participants : [];
    const isOnline =
      (item.location || '').toLowerCase().includes('meet') ||
      (item.location || '').toLowerCase().includes('online');

    const isDragging = dragPayload?.type === 'schedule' && dragPayload.id === item.id;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => {
          const data = { type: 'schedule', id: item.id };
          setDragPayload(data);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/json', JSON.stringify(data));
          e.dataTransfer.setData('text/plain', JSON.stringify(data));
        }}
        onDragEnd={() => {
          setDragPayload(null);
          setDragOverIso(null);
        }}
        onClick={() => handleOpenEdit(item)}
        className={`group cursor-grab rounded-xl border border-[#E6E0D4] border-l-[3px] bg-white p-3 transition-all hover:border-[#CFC8B8] hover:shadow-xs active:cursor-grabbing dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#394563] ${accent.borderLeft
          } ${isDragging ? 'opacity-45' : ''}`}
      >
        {/* Header Kartu Ringkas: Jam Monospace + 1 Tombol Menu Hover */}
        <div className="flex items-center justify-between gap-1.5 text-[#71717A] dark:text-[#9DA7BD]">
          <div className="flex min-w-0 items-center gap-1.5">
            {isOnline ? (
              <Video className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate font-mono text-[11px] font-medium">
              {item.start_time} - {item.end_time}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(item);
            }}
            title="Sunting atau jadikan tugas"
            aria-label="Opsi jadwal"
            className="shrink-0 rounded-full p-1 opacity-0 transition-opacity hover:bg-[#FAF7F0] hover:text-[#141518] group-hover:opacity-100 dark:hover:bg-[#232A3C] dark:hover:text-white"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        <p
          className={`mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-[#141518] dark:text-[#F1F5F9] ${item.status === 'done' ? 'line-through opacity-60' : ''
            }`}
        >
          {item.title}
        </p>

        {item.location && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        )}

        {item.attachment_name && (
          <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-[#E6E0D4] bg-[#FAF7F0] px-2 py-0.5 text-[10px] font-medium text-[#52525B] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#9DA7BD]">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.attachment_name}</span>
          </div>
        )}

        {/* Footer Kartu Seimbang: Maks 2 Inisial + Pill Status */}
        <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-[#F2EFE6] pt-2 dark:border-[#242B3D]">
          {participants.length > 0 ? (
            <div className="flex min-w-0 items-center -space-x-1">
              {participants.slice(0, 2).map((initials, idx) => (
                <span
                  key={`${item.id}-p-${idx}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white bg-[#F2EFE6] font-mono text-[9px] font-semibold text-[#3F3F46] dark:border-[#161B26] dark:bg-[#22293B] dark:text-[#CBD5E1]"
                >
                  {initials}
                </span>
              ))}
              {participants.length > 2 && (
                <span className="pl-1.5 font-mono text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                  +{participants.length - 2}
                </span>
              )}
            </div>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={(e) => handleQuickCycleStatus(e, item)}
            title="Klik untuk mengubah status"
            className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${statusMeta.cls}`}
          >
            {statusMeta.label}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Baris Judul Utama */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#141518] sm:text-3xl dark:text-[#F1F5F9]">
            Jadwal Terkini, {user?.name || 'Rekan Kerja'}
          </h1>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#9DA7BD]">
            Seret kartu jadwal antar hari atau seret tugas To-Do langsung ke kalender.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreate(selectedDayIso)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Jadwal</span>
          </button>

          <button
            type="button"
            onClick={loadSchedules}
            title="Muat ulang jadwal"
            aria-label="Muat ulang jadwal"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D7D0C3] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenNotes && (
            <button
              type="button"
              onClick={onOpenNotes}
              title="Buka Catatan Bebas"
              aria-label="Buka Catatan Bebas"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D7D0C3] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
            >
              <PenLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Baris Kontrol Periode & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-2 py-1 text-white dark:border dark:border-[#242B3D] dark:bg-[#161B26]">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Periode sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 font-mono text-xs font-semibold">
            {viewMode === 'year'
              ? `Tahun ${currentYear}`
              : viewMode === 'month'
                ? monthTitle
                : viewMode === 'today'
                  ? selectedDayIso
                  : `${weekStartLabel} - ${weekEndLabel}`}
          </span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Periode berikutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {schedules.length === 0 && !loading && (
            <button
              type="button"
              onClick={handleSeedDemoSchedules}
              className="rounded-full border border-[#D7D0C3] bg-white px-3 py-1 text-[11px] font-semibold text-[#141518] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
            >
              Muat Contoh Jadwal UKK
            </button>
          )}

          <div className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-white p-1 dark:border-[#242B3D] dark:bg-[#161B26]">
            {[
              { id: 'today', label: 'Harian' },
              { id: 'week', label: 'Mingguan' },
              { id: 'month', label: 'Bulanan' },
              { id: 'year', label: 'Tahunan' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${viewMode === tab.id
                  ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                  : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strip Tugas Aktif untuk Di-Drag Langsung ke Kalender (Integrasi Nyata To-Do <-> Schedule) */}
      {viewMode === 'week' && activeTodoTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E6E0D4] bg-white px-3.5 py-2.5 dark:border-[#242B3D] dark:bg-[#161B26]">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A] dark:text-[#9DA7BD]">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Seret tugas ke hari:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeTodoTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  const data = { type: 'task', id: task.id };
                  setDragPayload(data);
                  e.dataTransfer.effectAllowed = 'copyMove';
                  e.dataTransfer.setData('application/json', JSON.stringify(data));
                  e.dataTransfer.setData('text/plain', JSON.stringify(data));
                }}
                onDragEnd={() => {
                  setDragPayload(null);
                  setDragOverIso(null);
                }}
                className="inline-flex cursor-grab items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-1 text-[11px] font-medium text-[#141518] transition-colors hover:border-[#141518] active:cursor-grabbing dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:hover:border-[#60A5FA]"
              >
                <GripVertical className="h-3 w-3 text-[#71717A] dark:text-[#6B768F]" />
                <span className="max-w-[160px] truncate">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODE MINGGUAN (DRAG & DROP ANTAR KOLOM HARI) */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[920px] space-y-3">
            {/* Baris Header Hari */}
            <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-2.5">
              <div className="flex flex-col items-center justify-center font-mono text-[10px] font-semibold text-[#71717A] dark:text-[#9DA7BD]">
                <span>MGG</span>
                <span className="text-xs text-[#141518] dark:text-[#F1F5F9]">{weekNumber}</span>
              </div>

              {weekDays.map((day) => {
                const isSelected = day.iso === selectedDayIso;
                const isToday = day.iso === todayIso;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => setSelectedDayIso(day.iso)}
                    className={`relative flex flex-col items-center justify-center rounded-2xl border py-2 transition-colors ${isSelected
                      ? 'border-[#141518] bg-[#141518] text-white dark:border-[#93C5FD] dark:bg-[#93C5FD] dark:text-[#0F131D]'
                      : isToday
                        ? 'border-[#141518]/50 bg-white text-[#141518] dark:border-[#60A5FA]/70 dark:bg-[#161B26] dark:text-[#F1F5F9]'
                        : 'border-[#EAE4D8] bg-white text-[#141518] hover:border-[#C7BFA9] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:border-[#394563]'
                      } ${day.isSunday && !isSelected ? 'opacity-55' : ''}`}
                  >
                    <span className="text-[10px] font-semibold tracking-wider opacity-75">
                      {day.dayShort}
                    </span>
                    <span className="mt-0.5 font-mono text-xs font-bold">{day.dayMonth}</span>
                    {isToday && !isSelected && (
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#D473A7] dark:bg-[#60A5FA]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Area Timeline + 7 Kolom Dropzone */}
            <div className="relative rounded-3xl border border-[#EAE4D8] bg-[#FAF7F0] p-2 dark:border-[#242B3D] dark:bg-[#11151E]">
              {/* Garis Waktu Saat Ini Putus-Putus */}
              <div className="pointer-events-none relative z-10 mb-2 flex items-center gap-2">
                <span className="rounded-full border border-[#E6E0D4] bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#141518] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#93C5FD]">
                  {nowClock}
                </span>
                <div className="h-[1px] flex-1 border-t border-dashed border-[#C7C0B2] dark:border-[#2E364D]" />
              </div>

              <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-2.5">
                {/* Sumbu Jam Kiri */}
                <div className="flex flex-col justify-between py-2 text-right font-mono text-[10px] text-[#8A857B] dark:text-[#6B768F]">
                  {TIME_SLOTS.map((slot) => (
                    <span key={slot} className="pr-1">
                      {slot}
                    </span>
                  ))}
                </div>

                {/* 7 Kolom Hari (Droppable) */}
                {weekDays.map((day) => {
                  const daySchedules = schedules.filter((s) => s.date === day.iso);
                  const dayDueTasks = tasks.filter(
                    (t) => t.due_date === day.iso && t.status !== 'completed'
                  );
                  const isDropTarget = dragOverIso === day.iso;

                  return (
                    <div
                      key={day.iso}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIso(day.iso);
                      }}
                      onDragLeave={() => setDragOverIso(null)}
                      onDrop={(e) => handleDropOnDay(e, day.iso)}
                      className={`flex min-h-[380px] flex-col gap-2 rounded-2xl p-1.5 transition-all ${isDropTarget
                        ? 'bg-[#EAE4D8]/80 ring-2 ring-[#141518]/30 dark:bg-[#1D2538] dark:ring-[#93C5FD]/50'
                        : day.iso === selectedDayIso
                          ? 'bg-white/65 dark:bg-[#161C2B]/75'
                          : 'bg-transparent'
                        }`}
                    >
                      {daySchedules.map((item) => renderScheduleCard(item))}

                      {/* Penanda Deadline Tugas To-Do pada Hari Ini */}
                      {dayDueTasks.map((task) => (
                        <button
                          key={`due-${task.id}`}
                          type="button"
                          onClick={() => onEditTask && onEditTask(task)}
                          className="flex items-center gap-1.5 rounded-xl border border-dashed border-[#CFC8B8] bg-white/80 px-2.5 py-1.5 text-left text-[11px] text-[#52525B] transition-colors hover:border-[#141518] hover:text-[#141518] dark:border-[#2E3852] dark:bg-[#161B26]/85 dark:text-[#9DA7BD] dark:hover:border-[#60A5FA] dark:hover:text-white"
                        >
                          <CheckSquare className="h-3 w-3 shrink-0" />
                          <span className="truncate font-medium">Deadline: {task.title}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleOpenCreate(day.iso)}
                        className="mt-auto flex items-center justify-center gap-1 rounded-xl border border-dashed border-[#D7D0C3] py-2 text-[11px] font-semibold text-[#71717A] opacity-65 transition-all hover:border-[#141518] hover:bg-white hover:text-[#141518] hover:opacity-100 dark:border-[#242B3D] dark:text-[#9DA7BD] dark:hover:border-[#60A5FA] dark:hover:bg-[#161B26] dark:hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE HARIAN */}
      {viewMode === 'today' && (
        <div className="rounded-3xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
          <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3.5 dark:border-[#242B3D]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#71717A] dark:text-[#9DA7BD]" />
              <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                Agenda Tanggal {selectedDayIso}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreate(selectedDayIso)}
              className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-3 py-1.5 text-xs font-semibold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agenda Baru</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {schedules.filter((s) => s.date === selectedDayIso).length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Belum ada agenda terjadwal pada tanggal ini.
              </div>
            ) : (
              schedules
                .filter((s) => s.date === selectedDayIso)
                .map((item) => renderScheduleCard(item))
            )}
          </div>
        </div>
      )}

      {/* MODE BULANAN */}
      {viewMode === 'month' && (
        <div className="rounded-3xl border border-[#E6E0D4] bg-white p-4 dark:border-[#242B3D] dark:bg-[#161B26]">
          <div className="grid grid-cols-7 gap-2 pb-2 text-center font-mono text-[11px] font-bold text-[#71717A] dark:text-[#9DA7BD]">
            {['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell) => {
              const dayItems = schedules.filter((s) => s.date === cell.iso);
              const dayTasks = tasks.filter((t) => t.due_date === cell.iso);
              const isToday = cell.iso === todayIso;

              return (
                <div
                  key={cell.iso}
                  onClick={() => handleOpenCreate(cell.iso)}
                  className={`min-h-[105px] cursor-pointer rounded-2xl border p-2 transition-colors hover:border-[#141518]/40 dark:hover:border-[#60A5FA]/50 ${cell.inCurrentMonth
                    ? 'border-[#EFECE4] bg-[#FAF7F0] dark:border-[#242B3D] dark:bg-[#11151E]'
                    : 'border-transparent bg-[#FAF7F0]/40 opacity-45 dark:bg-[#0D1018]'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold ${isToday
                        ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                        : 'text-[#141518] dark:text-[#E2E7F2]'
                        }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {(dayItems.length > 0 || dayTasks.length > 0) && (
                      <span className="font-mono text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                        {dayItems.length + dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="block w-full truncate rounded-md border border-[#E6E0D4] bg-white px-1.5 py-0.5 text-left text-[10px] font-semibold text-[#141518] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#F1F5F9]"
                      >
                        {item.start_time} {item.title}
                      </button>
                    ))}
                    {dayTasks.slice(0, 1).map((task) => (
                      <button
                        key={`t-${task.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditTask) onEditTask(task);
                        }}
                        className="block w-full truncate rounded-md bg-[#EAE4D8] px-1.5 py-0.5 text-left text-[10px] font-medium text-[#52525B] dark:bg-[#1E2538] dark:text-[#CBD5E1]"
                      >
                        Deadline: {task.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE TAHUNAN: REKAP PER BULAN TANPA TANGGAL KALENDER */}
      {viewMode === 'year' && (
        <div className="space-y-5">
          {/* Header Banner Rekap Tahunan */}
          <div className="flex flex-col gap-3 rounded-3xl border border-[#E6E0D4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Rekap Tugas & Agenda Tahun {currentYear}
                </h2>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Klik pada salah satu kartu bulan di bawah untuk melihat rincian rekap tugas dan kegiatan pada bulan tersebut.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-center dark:border-[#262E42] dark:bg-[#10141E]">
                <span className="block font-mono text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  {yearTasks.length}
                </span>
                <span className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                  Total Tugas {currentYear}
                </span>
              </div>
              <div className="rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-center dark:border-[#262E42] dark:bg-[#10141E]">
                <span className="block font-mono text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  {yearSchedules.length}
                </span>
                <span className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                  Total Agenda {currentYear}
                </span>
              </div>
            </div>
          </div>

          {/* Grid 12 Kartu Bulan (Januari - Desember) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {yearMonthRecap.map((m) => {
              const isSelected = selectedYearMonth === m.monthIndex;

              return (
                <div
                  key={m.monthIndex}
                  onClick={() => setSelectedYearMonth(m.monthIndex)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl p-4 transition-all ${
                    isSelected
                      ? 'border-2 border-[#141518] bg-white shadow-md ring-2 ring-[#141518]/10 dark:border-[#93C5FD] dark:bg-[#161B26] dark:ring-[#93C5FD]/20'
                      : 'border border-[#E6E0D4] bg-[#FAF7F0] hover:border-[#141518]/40 hover:bg-white hover:shadow-xs dark:border-[#242B3D] dark:bg-[#11151E] dark:hover:border-[#60A5FA]/40 dark:hover:bg-[#161B26]'
                  }`}
                >
                  <div>
                    {/* Header Kartu: Nama Bulan & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#141518] dark:text-[#F1F5F9]">
                          {m.monthName}
                        </span>
                        {m.isCurrentMonth && (
                          <span className="rounded-full bg-[#141518] px-2 py-0.5 text-[10px] font-bold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]">
                            Bulan Ini
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="rounded-full bg-[#DCF3D1] px-2 py-0.5 text-[10px] font-bold text-[#1F5428] dark:bg-[#152920] dark:text-[#86EFAC]">
                          Aktif Dipilih
                        </span>
                      )}
                    </div>

                    {/* Ringkasan Angka Tugas & Agenda */}
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-bold tracking-tight text-[#141518] dark:text-[#F8FAFC]">
                        {m.totalTasks}{' '}
                        <span className="text-xs font-normal text-[#71717A] dark:text-[#9DA7BD]">
                          Tugas
                        </span>
                      </span>
                      {m.scheds.length > 0 && (
                        <span className="font-mono text-xs font-medium text-[#71717A] dark:text-[#9DA7BD]">
                          {m.scheds.length} Agenda
                        </span>
                      )}
                    </div>

                    {/* Bar Progres Penyelesaian */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                        <span>Penyelesaian</span>
                        <span className="font-mono font-bold text-[#141518] dark:text-[#F1F5F9]">
                          {m.rate}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE4] dark:bg-[#232A3C]">
                        <div
                          className="h-full rounded-full bg-[#141518] transition-all dark:bg-[#93C5FD]"
                          style={{ width: `${m.rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Pills */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                      <span className="rounded-md bg-[#DCF3D1] px-2 py-0.5 text-[#1F5428] dark:bg-[#152920] dark:text-[#86EFAC]">
                        {m.completedCount} Selesai
                      </span>
                      <span className="rounded-md bg-[#FCE5F1] px-2 py-0.5 text-[#702459] dark:bg-[#1A253B] dark:text-[#93C5FD]">
                        {m.inProgressCount} Berjalan
                      </span>
                      <span className="rounded-md bg-white border border-[#E6E0D4] px-2 py-0.5 text-[#52525B] dark:border-[#2C354A] dark:bg-[#1B2233] dark:text-[#CBD5E1]">
                        {m.todoCount} To-Do
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#EFECE4] pt-2 text-right dark:border-[#242B3D]">
                    <span className="text-[11px] font-semibold text-[#624CE0] group-hover:underline dark:text-[#93C5FD]">
                      {isSelected ? 'Rincian ditampilkan di bawah ↓' : 'Klik untuk lihat rincian tugas →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel Rekap Detail Bulan Terpilih */}
          <div className="rounded-3xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex flex-col gap-3 border-b border-[#EFECE4] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#242B3D]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-[#EBF3FE] px-2.5 py-1 text-xs font-bold text-[#1E40AF] dark:bg-[#1D3557] dark:text-[#93C5FD]">
                    Bulan {activeRecap.monthName} {currentYear}
                  </span>
                  {activeRecap.isCurrentMonth && (
                    <span className="text-xs font-medium text-[#71717A] dark:text-[#9DA7BD]">
                      (Bulan Saat Ini)
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-base font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Rekap Rincian Tugas Bulan {activeRecap.monthName}
                </h3>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Ditemukan {activeRecap.totalTasks} tugas ({activeRecap.completedCount} selesai, {activeRecap.inProgressCount} berjalan, {activeRecap.todoCount} to-do) dan {activeRecap.scheds.length} agenda.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleJumpToMonth(activeRecap.monthIndex)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-1.5 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-[#71717A] dark:text-[#9DA7BD]" />
                  <span>Buka Kalender Bulanan</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenCreate(
                      `${currentYear}-${String(activeRecap.monthIndex + 1).padStart(2, '0')}-01`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Agenda Bulan Ini</span>
                </button>
              </div>
            </div>

            {/* Bagian 1: 3 Card Status Nyamping (To-Do, Sedang Dikerjakan, Selesai) */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-[#9DA7BD]">
                  Rincian Status Tugas Bulan {activeRecap.monthName} ({activeRecap.totalTasks})
                </h4>
              </div>

              {/* 3 Kolom Card Nyamping */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* 1. Kolom To-Do */}
                <div className="flex flex-col rounded-2xl border border-[#E6E0D4] bg-[#FAF7F0] p-4 dark:border-[#242B3D] dark:bg-[#11151E]">
                  <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-3 dark:border-[#242B3D]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#71717A] dark:bg-[#9DA7BD]" />
                      <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                        To-Do (Menunggu)
                      </span>
                    </div>
                    <span className="rounded-full border border-[#E6E0D4] bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#52525B] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#CBD5E1]">
                      {activeRecap.tasks.filter((t) => t.status === 'todo').length}
                    </span>
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5">
                    {activeRecap.tasks.filter((t) => t.status === 'todo').length > 0 ? (
                      activeRecap.tasks
                        .filter((t) => t.status === 'todo')
                        .map((task) => {
                          const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                          const subStats = task.subtask_stats || { total: 0, completed: 0 };
                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                if (onEditTask) onEditTask(task);
                              }}
                              className="group cursor-pointer rounded-xl border border-[#E6E0D4] bg-white p-3.5 transition-all hover:border-[#141518]/40 hover:shadow-xs dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#394563]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-[#FAF7F0] border border-[#E6E0D4] px-2 py-0.5 text-[10px] font-medium text-[#52525B] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#CBD5E1]">
                                  {task.category || 'Umum'}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityMeta.badgeClass}`}
                                >
                                  {priorityMeta.label}
                                </span>
                              </div>

                              <p className="mt-2 text-xs font-bold text-[#141518] group-hover:underline dark:text-[#F1F5F9]">
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                                  {task.description}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#EFECE4] pt-2 text-[10px] text-[#71717A] dark:border-[#242B3D] dark:text-[#9DA7BD]">
                                {task.due_date ? (
                                  <span className="font-mono">Tenggat: {task.due_date}</span>
                                ) : (
                                  <span>Tanpa tenggat</span>
                                )}
                                {subStats.total > 0 && (
                                  <span className="font-mono">
                                    {subStats.completed}/{subStats.total} sub-tugas
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                        Tidak ada tugas To-Do di bulan ini.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Kolom Sedang Dikerjakan */}
                <div className="flex flex-col rounded-2xl border border-[#F3C5DF] bg-[#FCE5F1]/30 p-4 dark:border-[#2A3B61] dark:bg-[#182136]/50">
                  <div className="flex items-center justify-between border-b border-[#F3C5DF] pb-3 dark:border-[#2A3B61]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D473A7] dark:bg-[#93C5FD]" />
                      <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                        Sedang Dikerjakan
                      </span>
                    </div>
                    <span className="rounded-full bg-[#FCE5F1] px-2 py-0.5 font-mono text-[11px] font-bold text-[#702459] dark:bg-[#1E2E4A] dark:text-[#93C5FD]">
                      {activeRecap.tasks.filter((t) => t.status === 'in_progress').length}
                    </span>
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5">
                    {activeRecap.tasks.filter((t) => t.status === 'in_progress').length > 0 ? (
                      activeRecap.tasks
                        .filter((t) => t.status === 'in_progress')
                        .map((task) => {
                          const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                          const subStats = task.subtask_stats || { total: 0, completed: 0 };
                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                if (onEditTask) onEditTask(task);
                              }}
                              className="group cursor-pointer rounded-xl border border-[#E6E0D4] bg-white p-3.5 transition-all hover:border-[#141518]/40 hover:shadow-xs dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#394563]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-[#FAF7F0] border border-[#E6E0D4] px-2 py-0.5 text-[10px] font-medium text-[#52525B] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#CBD5E1]">
                                  {task.category || 'Umum'}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityMeta.badgeClass}`}
                                >
                                  {priorityMeta.label}
                                </span>
                              </div>

                              <p className="mt-2 text-xs font-bold text-[#141518] group-hover:underline dark:text-[#F1F5F9]">
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                                  {task.description}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#EFECE4] pt-2 text-[10px] text-[#71717A] dark:border-[#242B3D] dark:text-[#9DA7BD]">
                                {task.due_date ? (
                                  <span className="font-mono">Tenggat: {task.due_date}</span>
                                ) : (
                                  <span>Tanpa tenggat</span>
                                )}
                                {subStats.total > 0 && (
                                  <span className="font-mono">
                                    {subStats.completed}/{subStats.total} sub-tugas
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                        Tidak ada tugas yang sedang berjalan.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Kolom Selesai */}
                <div className="flex flex-col rounded-2xl border border-[#BCE2AA] bg-[#DCF3D1]/30 p-4 dark:border-[#224234] dark:bg-[#14251D]/50">
                  <div className="flex items-center justify-between border-b border-[#BCE2AA] pb-3 dark:border-[#224234]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#4F9E65] dark:bg-[#86EFAC]" />
                      <span className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                        Selesai
                      </span>
                    </div>
                    <span className="rounded-full bg-[#DCF3D1] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1F5428] dark:bg-[#152920] dark:text-[#86EFAC]">
                      {activeRecap.tasks.filter((t) => t.status === 'completed').length}
                    </span>
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5">
                    {activeRecap.tasks.filter((t) => t.status === 'completed').length > 0 ? (
                      activeRecap.tasks
                        .filter((t) => t.status === 'completed')
                        .map((task) => {
                          const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                          const subStats = task.subtask_stats || { total: 0, completed: 0 };
                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                if (onEditTask) onEditTask(task);
                              }}
                              className="group cursor-pointer rounded-xl border border-[#E6E0D4] bg-white p-3.5 opacity-80 transition-all hover:border-[#141518]/40 hover:opacity-100 hover:shadow-xs dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#394563]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-[#FAF7F0] border border-[#E6E0D4] px-2 py-0.5 text-[10px] font-medium text-[#52525B] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#CBD5E1]">
                                  {task.category || 'Umum'}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityMeta.badgeClass}`}
                                >
                                  {priorityMeta.label}
                                </span>
                              </div>

                              <p className="mt-2 text-xs font-bold text-[#71717A] line-through group-hover:underline dark:text-[#9DA7BD]">
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-[#A1A1AA] dark:text-[#6B768F]">
                                  {task.description}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#EFECE4] pt-2 text-[10px] text-[#71717A] dark:border-[#242B3D] dark:text-[#9DA7BD]">
                                {task.due_date ? (
                                  <span className="font-mono">Tenggat: {task.due_date}</span>
                                ) : (
                                  <span>Tanpa tenggat</span>
                                )}
                                {subStats.total > 0 && (
                                  <span className="font-mono">
                                    {subStats.completed}/{subStats.total} sub-tugas
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                        Belum ada tugas selesai di bulan ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Agenda Jadwal Bulan Ini */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between border-t border-[#EFECE4] pt-5 dark:border-[#242B3D]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-[#9DA7BD]">
                  Agenda Jadwal di Bulan {activeRecap.monthName} ({activeRecap.scheds.length})
                </h4>
              </div>

              {activeRecap.scheds.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeRecap.scheds.map((item) => renderScheduleCard(item))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#E6E0D4] p-6 text-center text-xs text-[#71717A] dark:border-[#262E42] dark:text-[#9DA7BD]">
                  Belum ada agenda kegiatan terjadwal pada bulan {activeRecap.monthName} {currentYear}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Sunting Jadwal */}
      <ScheduleModal
        key={`${modalOpen}-${editingSchedule?.id || 'new'}-${modalDefaultDate}`}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        onDelete={handleDeleteSchedule}
        onConvertToTask={onConvertScheduleToTask}
        editingSchedule={editingSchedule}
        defaultDate={modalDefaultDate}
        saving={saving}
      />
    </div>
  );
}
