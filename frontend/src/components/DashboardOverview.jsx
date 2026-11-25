import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Layers,
  ListTodo,
  Pin,
  Plus,
  Printer,
  RefreshCw,
  StickyNote,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/useContexts';
import {
  formatFullDateId,
  formatRelativeDeadline,
  formatRelativeTime,
  getDynamicGreeting,
  PRIORITY_META,
  STATUS_META,
} from '../utils/formatters';
import FocusTimerWidget from './FocusTimerWidget';

export default function DashboardOverview({
  tasks = [],
  schedules = [],
  notes = [],
  stats,
  onOpenCreate,
  onEditTask,
  onToggleComplete,
  onNavigate,
  onRefresh,
  onSeedDemo,
}) {
  const { user } = useAuth();
  const [now] = useState(() => new Date());

  const greeting = getDynamicGreeting(now);
  const formattedToday = formatFullDateId(now);
  const todayStr = now.toISOString().slice(0, 10);

  const urgentTasks = tasks
    .filter((task) => {
      if (task.status === 'completed') return false;
      return (
        task.is_pinned ||
        task.is_overdue ||
        task.due_date === todayStr ||
        task.priority === 'high'
      );
    })
    .slice(0, 5);

  // Daftar tugas berstatus To-Do (menunggu dikerjakan)
  const todoTasks = tasks
    .filter((task) => task.status === 'todo')
    .slice(0, 5);

  // Jadwal hari ini atau terdekat dari tabel schedules
  const todaySchedules = schedules
    .filter((item) => item.date >= todayStr && item.status !== 'done')
    .slice(0, 4);

  const recentNotes = notes.slice(-2).reverse();

  const recentActivities = [...tasks]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 4);

  const metrics = [
    {
      id: 'total',
      label: 'Total Tugas',
      value: stats?.total ?? 0,
      icon: Layers,
      cardClass:
        'bg-[#F2EFE6] border-[#E4DEC9] dark:bg-[#181E2B] dark:border-[#2A3347]',
      iconBg: 'bg-white text-[#141518] dark:bg-[#242C40] dark:text-[#E2E8F0]',
    },
    {
      id: 'todo',
      label: 'Tugas To-Do',
      value: stats?.todo ?? tasks.filter((t) => t.status === 'todo').length,
      hint: `${stats?.todo ?? 0} siap dikerjakan`,
      icon: ListTodo,
      cardClass:
        'bg-[#EBF3FE] border-[#CDE0FD] dark:bg-[#132238] dark:border-[#1E375C]',
      iconBg: 'bg-white/90 text-[#1E40AF] dark:bg-[#1D3557] dark:text-[#93C5FD]',
    },
    {
      id: 'in_progress',
      label: 'Sedang Dikerjakan',
      value: stats?.in_progress ?? 0,
      hint: 'Aktif dalam progres',
      icon: Clock,
      cardClass:
        'bg-[#FCE5F1] border-[#F3C5DF] dark:bg-[#182136] dark:border-[#2A3B61]',
      iconBg: 'bg-white/90 text-[#84205B] dark:bg-[#223254] dark:text-[#93C5FD]',
    },
    {
      id: 'completed',
      label: 'Selesai',
      value: stats?.completed ?? 0,
      hint: `${stats?.completion_rate ?? 0}% terselesaikan`,
      icon: CheckCircle2,
      cardClass:
        'bg-[#DCF3D1] border-[#BCE2AA] dark:bg-[#14251D] dark:border-[#224234]',
      iconBg: 'bg-white/90 text-[#1F5428] dark:bg-[#1C382B] dark:text-[#86EFAC]',
    },
    {
      id: 'overdue',
      label: 'Terlambat (Overdue)',
      value: stats?.overdue ?? 0,
      hint: stats?.overdue > 0 ? 'Perlu perhatian segera' : 'Jadwal tetap aman',
      icon: AlertTriangle,
      cardClass:
        'bg-[#FEF0B8] border-[#F0D981] dark:bg-[#261F13] dark:border-[#473B20]',
      iconBg: 'bg-white/90 text-[#7A5605] dark:bg-[#382D18] dark:text-[#FCD34D]',
    },
  ];

  const completionRate = stats?.completion_rate ?? 0;

  /* ── Statistik Kurva: hitung data 7 hari terakhir ── */
  const chartData = useMemo(() => {
    const days = 7;
    const labels = [];
    const todoLine = [];
    const progressLine = [];
    const doneLine = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      labels.push(dayName);

      // Hitung tugas yang dibuat pada / sebelum hari itu DAN belum selesai pada hari itu
      let todo = 0;
      let prog = 0;
      let done = 0;
      tasks.forEach((t) => {
        const created = t.created_at?.slice(0, 10);
        if (!created || created > iso) return;        // belum dibuat
        // Gunakan updated_at untuk estimasi kapan status berubah
        const updated = t.updated_at?.slice(0, 10) ?? created;

        if (t.status === 'completed' && updated <= iso) done++;
        else if (t.status === 'in_progress' && (updated <= iso || created <= iso)) prog++;
        else if (created <= iso) todo++;
      });
      todoLine.push(todo);
      progressLine.push(prog);
      doneLine.push(done);
    }

    // Cari max untuk skala Y
    const allVals = [...todoLine, ...progressLine, ...doneLine];
    const maxVal = Math.max(...allVals, 1);

    return { labels, todoLine, progressLine, doneLine, maxVal };
  }, [tasks, now]);

  /* ── Helper SVG: ubah array angka → polyline points ── */
  const toPoints = (data, maxVal, width, height, padX, padY) => {
    const stepX = (width - padX * 2) / Math.max(data.length - 1, 1);
    return data
      .map((v, i) => {
        const x = padX + i * stepX;
        const y = padY + (height - padY * 2) * (1 - v / maxVal);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header Editorial */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#141518] px-3 py-1 font-mono text-[11px] font-medium text-white dark:bg-[#1B253B] dark:text-[#93C5FD] dark:border dark:border-[#2C4066]">
              {formattedToday}
            </span>
            <span className="rounded-full border border-[#E6E0D4] bg-white px-3 py-1 text-[11px] font-medium text-[#52525B] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD]">
              {user?.role || 'Siswa XII PPLG'}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#141518] sm:text-3xl dark:text-[#F1F5F9]">
            {greeting}, {user?.name || 'Rekan Kerja'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Tugas</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Muat ulang data terbaru"
              aria-label="Muat ulang data"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E0D4] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-3.5 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <CalendarDays className="h-3.5 w-3.5 text-[#71717A] dark:text-[#9DA7BD]" />
            <span>Jadwal ({schedules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('notes')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-3.5 py-2 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <StickyNote className="h-3.5 w-3.5 text-[#71717A] dark:text-[#9DA7BD]" />
            <span>Catatan ({notes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Cetak Laporan UKK"
            aria-label="Cetak Laporan UKK"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E0D4] bg-white text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Kartu Metrik Pastel Rounded-2xl */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 ${card.cardClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">
                  {card.label}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${card.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-[#141518] dark:text-[#F8FAFC]">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#52525B] dark:text-[#9DA7BD]">
                {card.hint}
              </p>
            </div>
          );
        })}
      </div>

      {/* ═══ Kurva Statistik Tugas (SVG Line Chart) ═══ */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#624CE0] dark:bg-[#1E1B4B] dark:text-[#A78BFA]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                Statistik Tugas — 7 Hari Terakhir
              </h2>
              <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Tren jumlah tugas per status harian
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded-full bg-[#F59E0B]" />
              <span className="text-[#52525B] dark:text-[#CBD5E1]">To-Do</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded-full bg-[#EC4899]" />
              <span className="text-[#52525B] dark:text-[#CBD5E1]">Dikerjakan</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded-full bg-[#22C55E]" />
              <span className="text-[#52525B] dark:text-[#CBD5E1]">Selesai</span>
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[#EFECE4] bg-[#FDFCF9] dark:border-[#232A3C] dark:bg-[#10141E]">
          <svg
            viewBox="0 0 560 220"
            className="h-auto w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Grafik statistik tugas 7 hari terakhir"
          >
            {/* Grid garis horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = 30 + (160 * (1 - frac));
              const label = Math.round(chartData.maxVal * frac);
              return (
                <g key={frac}>
                  <line
                    x1="50" y1={y} x2="530" y2={y}
                    className="stroke-[#E6E0D4] dark:stroke-[#242B3D]"
                    strokeWidth="0.7"
                    strokeDasharray={frac === 0 ? '' : '4,3'}
                  />
                  <text
                    x="42" y={y + 4}
                    textAnchor="end"
                    className="fill-[#A1A1AA] dark:fill-[#52525B] font-mono"
                    style={{ fontSize: '10px' }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Label hari di sumbu X */}
            {chartData.labels.map((label, i) => {
              const stepX = (560 - 50 * 2) / Math.max(chartData.labels.length - 1, 1);
              const x = 50 + i * stepX;
              return (
                <text
                  key={i}
                  x={x} y={210}
                  textAnchor="middle"
                  className="fill-[#71717A] dark:fill-[#9DA7BD] font-mono"
                  style={{ fontSize: '10px' }}
                >
                  {label}
                </text>
              );
            })}

            {/* Area fill + lines */}
            {/* To-Do (amber) */}
            <polyline
              points={toPoints(chartData.todoLine, chartData.maxVal, 560, 220, 50, 30)}
              fill="none"
              className="stroke-[#F59E0B]"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Sedang Dikerjakan (pink) */}
            <polyline
              points={toPoints(chartData.progressLine, chartData.maxVal, 560, 220, 50, 30)}
              fill="none"
              className="stroke-[#EC4899]"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Selesai (green) */}
            <polyline
              points={toPoints(chartData.doneLine, chartData.maxVal, 560, 220, 50, 30)}
              fill="none"
              className="stroke-[#22C55E]"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots pada setiap data point */}
            {[
              { data: chartData.todoLine, color: '#F59E0B' },
              { data: chartData.progressLine, color: '#EC4899' },
              { data: chartData.doneLine, color: '#22C55E' },
            ].map(({ data, color }) => {
              const stepX = (560 - 50 * 2) / Math.max(data.length - 1, 1);
              return data.map((v, i) => {
                const cx = 50 + i * stepX;
                const cy = 30 + (160) * (1 - v / chartData.maxVal);
                return (
                  <g key={`${color}-${i}`}>
                    <circle cx={cx} cy={cy} r="5" fill={color} opacity="0.15" />
                    <circle cx={cx} cy={cy} r="3" fill={color} />
                    {/* Tooltip value */}
                    <title>{`${chartData.labels[i]}: ${v}`}</title>
                  </g>
                );
              });
            })}
          </svg>
        </div>

        {/* Ringkasan angka cepat di bawah chart */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#FFFBEB] p-2.5 dark:bg-[#1C1507]">
            <p className="font-mono text-lg font-bold text-[#B45309] dark:text-[#FCD34D]">{stats?.todo ?? 0}</p>
            <p className="text-[10px] font-medium text-[#92400E] dark:text-[#D97706]">To-Do</p>
          </div>
          <div className="rounded-xl bg-[#FDF2F8] p-2.5 dark:bg-[#1C0B16]">
            <p className="font-mono text-lg font-bold text-[#BE185D] dark:text-[#F472B6]">{stats?.in_progress ?? 0}</p>
            <p className="text-[10px] font-medium text-[#9D174D] dark:text-[#EC4899]">Dikerjakan</p>
          </div>
          <div className="rounded-xl bg-[#F0FDF4] p-2.5 dark:bg-[#071A0E]">
            <p className="font-mono text-lg font-bold text-[#15803D] dark:text-[#86EFAC]">{stats?.completed ?? 0}</p>
            <p className="text-[10px] font-medium text-[#166534] dark:text-[#22C55E]">Selesai</p>
          </div>
        </div>
      </div>

      {/* Kartu Progres Penyelesaian Real-Time */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
              Progres Penyelesaian Keseluruhan
            </h2>
            <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
              {stats?.completed ?? 0} tugas selesai dari total {stats?.total ?? 0} tugas di database.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-[#D5E3FF] px-3 py-1 font-mono text-sm font-bold text-[#1D3B7A] dark:border dark:border-[#2C4066] dark:bg-[#1B2842] dark:text-[#93C5FD]">
            {completionRate}%
          </span>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#EFECE4] dark:bg-[#212838]">
          <div
            className="h-full rounded-full bg-[#141518] transition-all duration-500 dark:bg-[#93C5FD]"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {Array.isArray(stats?.categories) && stats.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-[#71717A] dark:text-[#9DA7BD]">
              Kategori:
            </span>
            {stats.categories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-0.5 text-[11px] font-medium text-[#3F3F46] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#CBD5E1]"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid Utama: Kiri (Tugas Mendesak + Jadwal Terdekat), Kanan (Timer + Sticky Notes + Aktivitas) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* Panel Fokus Hari Ini / Tugas Mendesak */}
          <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3.5 dark:border-[#242B3D]">
              <div>
                <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Fokus Hari Ini & Tugas Mendesak
                </h2>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Prioritas tinggi, tugas disematkan, dan tenggat terdekat
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('all')}
                className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-1 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <span>Lihat semua</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {urgentTasks.length > 0 ? (
              <div className="mt-3 space-y-2">
                {urgentTasks.map((task) => {
                  const deadline = formatRelativeDeadline(task.due_date, task.status);
                  const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                  const subStats = task.subtask_stats || { total: 0, completed: 0 };

                  return (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#EFECE4] bg-[#FAF7F0] p-3.5 transition-colors hover:border-[#CFC8B8] dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task)}
                          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#C7BFA9] bg-white text-transparent transition-colors hover:border-[#141518] dark:border-[#3B4661] dark:bg-[#161B26] dark:hover:border-[#93C5FD]"
                          aria-label={`Tandai ${task.title} selesai`}
                        >
                          <Check className="h-3 w-3" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.is_pinned && (
                              <Pin className="h-3 w-3 shrink-0 text-[#52525B] dark:text-[#FCD34D]" />
                            )}
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="truncate text-left text-sm font-semibold text-[#141518] hover:underline dark:text-[#F1F5F9]"
                            >
                              {task.title}
                            </button>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-white px-2 py-0.5 font-medium text-[#52525B] dark:border dark:border-[#273045] dark:bg-[#1A202E] dark:text-[#CBD5E1]">
                              {task.category}
                            </span>
                            <span
                              className={`font-mono ${deadline.isOverdue
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : 'text-[#71717A] dark:text-[#9DA7BD]'
                                }`}
                            >
                              {deadline.text}
                            </span>
                            {subStats.total > 0 && (
                              <span className="font-mono text-[#71717A] dark:text-[#9DA7BD]">
                                · {subStats.completed}/{subStats.total} checklist
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${priorityMeta.badgeClass}`}
                      >
                        {priorityMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-[#141518] dark:text-[#F1F5F9]">
                  {tasks.length === 0
                    ? 'Belum ada tugas tersimpan di akun ini'
                    : 'Tidak ada tugas mendesak saat ini'}
                </p>
                <p className="mt-1 text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  {tasks.length === 0
                    ? 'Buat tugas baru atau muat 7 contoh tugas proyek UKK sekaligus.'
                    : 'Semua tugas prioritas tinggi dan tenggat hari ini sudah selesai.'}
                </p>
                {tasks.length === 0 && onSeedDemo && (
                  <button
                    type="button"
                    onClick={onSeedDemo}
                    className="mt-3 rounded-full bg-[#141518] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
                  >
                    Isi Contoh Tugas & Catatan UKK
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card To-Do (Daftar Tugas Siap Dikerjakan) */}
          <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3.5 dark:border-[#242B3D]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FE] text-[#1E40AF] dark:bg-[#1D3557] dark:text-[#93C5FD]">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                    Daftar Tugas To-Do
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                    {todoTasks.length} tugas menunggu untuk dikerjakan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-1 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('all')}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-2.5 py-1 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {todoTasks.length > 0 ? (
              <div className="mt-3 space-y-2">
                {todoTasks.map((task) => {
                  const deadline = formatRelativeDeadline(task.due_date, task.status);
                  const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                  const subStats = task.subtask_stats || { total: 0, completed: 0 };

                  return (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#EFECE4] bg-[#FAF7F0] p-3.5 transition-colors hover:border-[#CFC8B8] dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task)}
                          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#C7BFA9] bg-white text-transparent transition-colors hover:border-[#141518] dark:border-[#3B4661] dark:bg-[#161B26] dark:hover:border-[#93C5FD]"
                          title="Tandai tugas selesai"
                          aria-label={`Tandai ${task.title} selesai`}
                        >
                          <Check className="h-3 w-3" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.is_pinned && (
                              <Pin className="h-3 w-3 shrink-0 text-[#52525B] dark:text-[#FCD34D]" />
                            )}
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="truncate text-left text-sm font-semibold text-[#141518] hover:underline dark:text-[#F1F5F9]"
                            >
                              {task.title}
                            </button>
                          </div>

                          {task.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-[#71717A] dark:text-[#9DA7BD]">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-white px-2 py-0.5 font-medium text-[#52525B] dark:border dark:border-[#273045] dark:bg-[#1A202E] dark:text-[#CBD5E1]">
                              {task.category}
                            </span>
                            {task.due_date && (
                              <span
                                className={`font-mono ${deadline.isOverdue
                                  ? 'font-semibold text-rose-600 dark:text-rose-400'
                                  : 'text-[#71717A] dark:text-[#9DA7BD]'
                                  }`}
                              >
                                {deadline.text}
                              </span>
                            )}
                            {subStats.total > 0 && (
                              <span className="font-mono text-[#71717A] dark:text-[#9DA7BD]">
                                · {subStats.completed}/{subStats.total} sub-tugas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${priorityMeta.badgeClass}`}
                      >
                        {priorityMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-7 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1E40AF] dark:bg-[#1D3557] dark:text-[#93C5FD]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="mt-2 text-xs font-semibold text-[#141518] dark:text-[#F1F5F9]">
                  Tidak ada tugas yang menunggu di daftar To-Do
                </p>
                <p className="mt-0.5 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                  Semua tugas sedang dikerjakan atau sudah terselesaikan.
                </p>
              </div>
            )}
          </div>

          {/* Panel Ringkas Jadwal Terdekat (Menghubungkan Schedule <-> Dashboard) */}
          <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3.5 dark:border-[#242B3D]">
              <div>
                <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Agenda Jadwal Terdekat
                </h2>
                <p className="text-xs text-[#71717A] dark:text-[#9DA7BD]">
                  Tersinkron langsung dari tabel Jadwal di database MySQL
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-1 text-xs font-semibold text-[#141518] transition-colors hover:bg-[#EFECE4] dark:border-[#262E42] dark:bg-[#10141E] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <span>Buka Jadwal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {todaySchedules.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {todaySchedules.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('schedule')}
                    className="rounded-xl border border-[#EFECE4] bg-[#FAF7F0] p-3 text-left transition-colors hover:border-[#CFC8B8] dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                      <span className="font-mono">
                        {item.date} · {item.start_time}-{item.end_time}
                      </span>
                      <span className={item.status === 'in_progress' ? 'font-semibold text-[#624CE0] dark:text-[#93C5FD]' : ''}>
                        {item.status === 'in_progress' ? 'Berjalan' : 'Terjadwal'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                      {item.location || 'Ruang Kerja'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Belum ada jadwal mendatang pekan ini. Buka menu Jadwal untuk menambahkan agenda.
              </p>
            )}
          </div>
        </div>

        {/* Panel Kanan: Timer + Sticky Notes Preview + Aktivitas Terbaru */}
        <div className="space-y-5 lg:col-span-5">
          <FocusTimerWidget tasks={tasks} />

          {/* Preview Catatan Bebas (Menghubungkan Sticky Notes <-> Dashboard) */}
          <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 dark:border-[#242B3D]">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-[#71717A] dark:text-[#9DA7BD]" />
                <h2 className="text-sm font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Catatan Bebas ({notes.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-[#141518] hover:underline dark:text-[#93C5FD]"
              >
                Buka Papan
              </button>
            </div>

            {recentNotes.length > 0 ? (
              <div className="mt-3 space-y-2">
                {recentNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onNavigate('notes')}
                    className="flex w-full items-start justify-between gap-2 rounded-xl border border-[#EFECE4] bg-[#FAF7F0] p-3 text-left transition-colors hover:border-[#CFC8B8] dark:border-[#232A3C] dark:bg-[#10141E] dark:hover:border-[#394563]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                        {n.title || 'Catatan'}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                        {n.content || (n.image_data ? 'Lampiran gambar' : 'Kosong')}
                      </p>
                    </div>
                    {n.image_data && (
                      <ImageIcon className="h-4 w-4 shrink-0 text-[#71717A] dark:text-[#93C5FD]" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Belum ada catatan tempel. Klik Buka Papan untuk menempel ide atau gambar.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 dark:border-[#242B3D] dark:bg-[#161B26]">
            <h2 className="border-b border-[#EFECE4] pb-3 text-sm font-bold text-[#141518] dark:border-[#242B3D] dark:text-[#F1F5F9]">
              Aktivitas Terbaru
            </h2>

            {recentActivities.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {recentActivities.map((task) => {
                  const statusMeta = STATUS_META[task.status] || STATUS_META.todo;
                  return (
                    <li key={task.id} className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="flex min-w-0 items-start gap-2.5 text-left"
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusMeta.dotClass}`} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#141518] hover:underline dark:text-[#F1F5F9]">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                            {statusMeta.label} · {task.category}
                          </p>
                        </div>
                      </button>

                      <span className="shrink-0 font-mono text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                        {formatRelativeTime(task.updated_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Belum ada riwayat aktivitas tugas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
