/**
 * Utilitas Pemformatan & Ekspor Data (Bahasa Indonesia)
 * ------------------------------------------------------
 * Menyimpan mapping kamus status, prioritas, preset kategori, format tanggal lokal,
 * sapaan dinamis, serta fungsi ekspor CSV untuk keperluan laporan UKK.
 */

export const DEFAULT_CATEGORIES = [
  'UKK Backend',
  'UKK Frontend',
  'Basis Data',
  'Dokumentasi',
  'Quality Assurance',
  'Presentasi',
  'DevOps Lokal',
  'Umum',
];

export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'Sedang Dikerjakan' },
  { value: 'completed', label: 'Selesai' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
];

export const STATUS_META = {
  todo: {
    label: 'To Do',
    badgeClass:
      'bg-[#D5E3FF]/70 text-[#1D3B7A] border-[#B8CEFF] dark:bg-[#1A253B] dark:text-[#9FC2FF] dark:border-[#2C4066]',
    dotClass: 'bg-[#5B8DEF]',
  },
  in_progress: {
    label: 'Dikerjakan',
    badgeClass:
      'bg-[#F7D6EA]/80 text-[#702459] border-[#EAB8D5] dark:bg-[#242042] dark:text-[#C4B5FD] dark:border-[#3C356E]',
    dotClass: 'bg-[#E57CB8] dark:bg-[#A78BFA]',
  },
  completed: {
    label: 'Selesai',
    badgeClass:
      'bg-[#DCF3D1]/80 text-[#1F5428] border-[#BCE3AA] dark:bg-[#152920] dark:text-[#86EFAC] dark:border-[#234736]',
    dotClass: 'bg-[#4FA963]',
  },
};

export const PRIORITY_META = {
  low: {
    label: 'Rendah',
    badgeClass:
      'bg-[#EFECE4] text-[#57534E] border-[#DFD9CB] dark:bg-[#1D2332] dark:text-[#9DA7BD] dark:border-[#2B3347]',
  },
  medium: {
    label: 'Sedang',
    badgeClass:
      'bg-[#FEF0B8] text-[#6B4E08] border-[#F0D981] dark:bg-[#292214] dark:text-[#FCD34D] dark:border-[#473B20]',
  },
  high: {
    label: 'Tinggi',
    badgeClass:
      'bg-[#FAD4DC] text-[#841D35] border-[#EEB0BE] dark:bg-[#2E1A22] dark:text-[#FDA4AF] dark:border-[#4F2B38]',
  },
};

export const AVATAR_PRESETS = [
  { id: 'preset:cobalt', label: 'Periwinkle', bgClass: 'bg-[#4F6DF5] text-white' },
  { id: 'preset:obsidian', label: 'Obsidian', bgClass: 'bg-[#141518] text-white dark:bg-[#27272A]' },
  { id: 'preset:emerald', label: 'Sage', bgClass: 'bg-[#3F8F56] text-white' },
  { id: 'preset:amber', label: 'Butter', bgClass: 'bg-[#D99B26] text-white' },
  { id: 'preset:slate', label: 'Plum', bgClass: 'bg-[#8D4983] text-white' },
];

export function getAvatarPresetClass(avatarValue) {
  const found = AVATAR_PRESETS.find((preset) => preset.id === avatarValue);
  return found ? found.bgClass : 'bg-[#2563EB] text-white';
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getDynamicGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function formatFullDateId(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateString) {
  if (!dateString) return 'Tanpa tenggat';
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatRelativeDeadline(dateString, status) {
  if (!dateString) return { text: 'Tanpa tenggat', isOverdue: false, isToday: false };

  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const shortLabel = formatShortDate(dateString);

  if (status === 'completed') {
    return { text: shortLabel, isOverdue: false, isToday: diffDays === 0 };
  }
  if (diffDays < 0) {
    return {
      text: `Terlambat ${Math.abs(diffDays)} hari (${shortLabel})`,
      isOverdue: true,
      isToday: false,
    };
  }
  if (diffDays === 0) {
    return { text: `Hari Ini (${shortLabel})`, isOverdue: false, isToday: true };
  }
  if (diffDays === 1) {
    return { text: `Besok (${shortLabel})`, isOverdue: false, isToday: false };
  }
  return { text: shortLabel, isOverdue: false, isToday: false };
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Baru saja';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function extractApiErrorMessage(error, fallback = 'Terjadi kesalahan pada server.') {
  const responseData = error?.response?.data;
  if (responseData?.errors) {
    const firstKey = Object.keys(responseData.errors)[0];
    if (firstKey && Array.isArray(responseData.errors[firstKey]) && responseData.errors[firstKey][0]) {
      return responseData.errors[firstKey][0];
    }
  }
  if (responseData?.message) {
    return responseData.message;
  }
  if (error?.code === 'ERR_NETWORK') {
    return 'Tidak dapat terhubung ke server API. Pastikan backend Laravel berjalan di port 8000.';
  }
  return fallback;
}

/**
 * Mengekspor daftar tugas beserta ringkasan sub-tugas menjadi berkas `.csv`
 * (dilengkapi UTF-8 BOM agar terbaca rapi di Microsoft Excel).
 */
export function exportTasksToCsv(tasks = [], user = null) {
  const escapeCsv = (value) => {
    const str = String(value ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    'No',
    'Judul Tugas',
    'Deskripsi',
    'Kategori',
    'Prioritas',
    'Status',
    'Tenggat Waktu',
    'Penting (Pin)',
    'Progres Sub-Tugas',
    'Daftar Sub-Tugas',
  ];

  const rows = tasks.map((task, idx) => {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const doneCount = subtasks.filter((s) => s.is_completed).length;
    const progressText = subtasks.length > 0 ? `${doneCount}/${subtasks.length} selesai` : '-';
    const subtaskList = subtasks
      .map((s) => `[${s.is_completed ? 'x' : ' '}] ${s.title}`)
      .join(' | ');

    return [
      idx + 1,
      task.title,
      task.description || '-',
      task.category || 'Umum',
      PRIORITY_META[task.priority]?.label || task.priority,
      STATUS_META[task.status]?.label || task.status,
      task.due_date || '-',
      task.is_pinned ? 'Ya' : 'Tidak',
      progressText,
      subtaskList || '-',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = `\uFEFF${headers.map(escapeCsv).join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const slug = (user?.name || 'ukk-pplg').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dateTag = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `rekap-tugas-${slug}-${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

