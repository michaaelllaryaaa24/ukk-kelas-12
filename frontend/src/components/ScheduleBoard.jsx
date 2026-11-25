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
import { extractApiErrorMessage } from '../utils/formatters';
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

  // Tahunan: data 12 bulan untuk tahun aktif
  const currentYear = anchorDate.getFullYear();
  const yearSchedules = schedules.filter(
    (s) => s.date && s.date.startsWith(String(currentYear))
  );
  const yearTasks = tasks.filter(
    (t) => t.due_date && t.due_date.startsWith(String(currentYear))
  );

  const yearMonthData = Array.from({ length: 12 }, (_, m) => {
    const firstDay = new Date(currentYear, m, 1);
    const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
    const rawDay = firstDay.getDay();
    const startOffset = rawDay === 0 ? 6 : rawDay - 1;
    const mStr = String(m + 1).padStart(2, '0');
    const monthIsoPrefix = `${currentYear}-${mStr}`;

    const monthScheds = schedules.filter(
      (s) => s.date && s.date.startsWith(monthIsoPrefix)
    );
    const monthTaskCount = tasks.filter(
      (t) => t.due_date && t.due_date.startsWith(monthIsoPrefix)
    ).length;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dStr = String(dayNum).padStart(2, '0');
      const iso = `${monthIsoPrefix}-${dStr}`;
      const hasSched = schedules.some((s) => s.date === iso);
      const hasTask = tasks.some((t) => t.due_date === iso);
      const isToday = iso === todayIso;
      return {
        dayNum,
        iso,
        hasSched,
        hasTask,
        isToday,
      };
    });

    return {
      monthIndex: m,
      monthName: MONTH_NAMES_ID[m],
      startOffset,
      days,
      schedCount: monthScheds.length,
      taskCount: monthTaskCount,
    };
  });

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
        className={`group cursor-grab rounded-xl border border-[#E6E0D4] border-l-[3px] bg-white p-3 transition-all hover:border-[#CFC8B8] hover:shadow-xs active:cursor-grabbing dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#394563] ${
          accent.borderLeft
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
          className={`mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-[#141518] dark:text-[#F1F5F9] ${
            item.status === 'done' ? 'line-through opacity-60' : ''
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
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  viewMode === tab.id
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
                    className={`relative flex flex-col items-center justify-center rounded-2xl border py-2 transition-colors ${
                      isSelected
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
                      className={`flex min-h-[380px] flex-col gap-2 rounded-2xl p-1.5 transition-all ${
                        isDropTarget
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
                  className={`min-h-[105px] cursor-pointer rounded-2xl border p-2 transition-colors hover:border-[#141518]/40 dark:hover:border-[#60A5FA]/50 ${
                    cell.inCurrentMonth
                      ? 'border-[#EFECE4] bg-[#FAF7F0] dark:border-[#242B3D] dark:bg-[#11151E]'
                      : 'border-transparent bg-[#FAF7F0]/40 opacity-45 dark:bg-[#0D1018]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                        isToday
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

      {/* MODE TAHUNAN */}
      {viewMode === 'year' && (
        <div className="space-y-4">
          {/* Banner Ringkasan Tahunan */}
          <div className="flex flex-col gap-3 rounded-3xl border border-[#E6E0D4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Kalender Tahunan {currentYear}
                </h2>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Klik tanggal untuk menambah agenda, atau klik nama bulan untuk membuka tampilan bulanan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-center dark:border-[#262E42] dark:bg-[#10141E]">
                <span className="block font-mono text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  {yearSchedules.length}
                </span>
                <span className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                  Agenda Tahun Ini
                </span>
              </div>
              <div className="rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-1.5 text-center dark:border-[#262E42] dark:bg-[#10141E]">
                <span className="block font-mono text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  {yearTasks.length}
                </span>
                <span className="text-[10px] text-[#71717A] dark:text-[#9DA7BD]">
                  Deadline Tugas
                </span>
              </div>
            </div>
          </div>

          {/* Legenda Indikator */}
          <div className="flex flex-wrap items-center justify-end gap-4 px-2 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#141518] dark:bg-[#93C5FD]" />
              <span>Hari Ini</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5E8BE6]" />
              <span>Ada Agenda</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
              <span>Ada Deadline Tugas</span>
            </div>
          </div>

          {/* Grid 12 Bulan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {yearMonthData.map((m) => (
              <div
                key={m.monthIndex}
                className="flex flex-col justify-between rounded-2xl border border-[#E6E0D4] bg-white p-3.5 transition-all hover:border-[#141518]/30 hover:shadow-xs dark:border-[#242B3D] dark:bg-[#161B26] dark:hover:border-[#60A5FA]/40"
              >
                <div>
                  {/* Header Bulan */}
                  <div className="flex items-center justify-between border-b border-[#EFECE4] pb-2 dark:border-[#242B3D]">
                    <button
                      type="button"
                      onClick={() => handleJumpToMonth(m.monthIndex)}
                      className="group flex items-center gap-1 text-left font-bold text-xs text-[#141518] hover:text-[#5E8BE6] dark:text-[#F1F5F9] dark:hover:text-[#93C5FD]"
                      title={`Buka tampilan bulan ${m.monthName}`}
                    >
                      <span>{m.monthName}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                    {m.schedCount > 0 && (
                      <span className="rounded-full bg-[#EBF3FE] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1E40AF] dark:bg-[#1D3557] dark:text-[#93C5FD]">
                        {m.schedCount} agenda
                      </span>
                    )}
                  </div>

                  {/* Header Singkatan Hari */}
                  <div className="mt-2 grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold text-[#71717A] dark:text-[#6B768F]">
                    {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </div>

                  {/* Grid Hari dalam Bulan */}
                  <div className="mt-1 grid grid-cols-7 gap-1 text-center font-mono text-[11px]">
                    {/* Padding awal offset */}
                    {Array.from({ length: m.startOffset }).map((_, idx) => (
                      <div key={`offset-${idx}`} className="h-6 w-full" />
                    ))}

                    {/* Tanggal dalam Bulan */}
                    {m.days.map((day) => (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => handleOpenCreate(day.iso)}
                        title={`${day.dayNum} ${m.monthName} ${currentYear}${
                          day.hasSched ? ' (Ada agenda)' : ''
                        }${day.hasTask ? ' (Ada tenggat tugas)' : ''}`}
                        className={`relative flex h-6 w-full flex-col items-center justify-center rounded-lg transition-colors ${
                          day.isToday
                            ? 'bg-[#141518] font-bold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                            : 'text-[#141518] hover:bg-[#FAF7F0] dark:text-[#E2E7F2] dark:hover:bg-[#1B2233]'
                        }`}
                      >
                        <span className="leading-none">{day.dayNum}</span>
                        {/* Indikator Titik */}
                        <div className="absolute -bottom-0.5 flex gap-0.5">
                          {day.hasSched && (
                            <span
                              className={`h-1 w-1 rounded-full ${
                                day.isToday ? 'bg-white dark:bg-[#0F131D]' : 'bg-[#5E8BE6]'
                              }`}
                            />
                          )}
                          {day.hasTask && (
                            <span
                              className={`h-1 w-1 rounded-full ${
                                day.isToday ? 'bg-white dark:bg-[#0F131D]' : 'bg-[#F43F5E]'
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 border-t border-[#EFECE4] pt-2 text-right dark:border-[#242B3D]">
                  <button
                    type="button"
                    onClick={() => handleJumpToMonth(m.monthIndex)}
                    className="text-[10px] font-semibold text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white"
                  >
                    Buka Bulan Ini &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Panel Daftar Agenda Tahun Ini */}
          <div className="rounded-3xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3.5 dark:border-[#242B3D]">
              <div>
                <h3 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Daftar Agenda Tahun {currentYear}
                </h3>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Semua agenda kegiatan terjadwal di tahun {currentYear}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreate(`${currentYear}-01-01`)}
                className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-3 py-1.5 text-xs font-semibold text-white dark:bg-[#93C5FD] dark:text-[#0F131D]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Agenda</span>
              </button>
            </div>

            {yearSchedules.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {yearSchedules.map((item) => renderScheduleCard(item))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-xs font-semibold text-[#141518] dark:text-[#F1F5F9]">
                  Belum ada agenda di tahun {currentYear}
                </p>
                <p className="mt-1 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                  Klik tanggal pada kalender di atas atau tombol Tambah Agenda untuk mulai menjadwalkan kegiatan.
                </p>
              </div>
            )}
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
