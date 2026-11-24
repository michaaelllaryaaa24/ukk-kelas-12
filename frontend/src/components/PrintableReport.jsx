import { useAuth } from '../context/useContexts';
import {
  formatFullDateId,
  formatShortDate,
  PRIORITY_META,
  STATUS_META,
} from '../utils/formatters';

/**
 * Laporan Siap Cetak (Print-Ready Report)
 * ----------------------------------------
 * Tersembunyi di layar (`hidden`), dan otomatis tampil rapi saat pengguna menekan
 * tombol "Cetak Laporan" (`window.print()`) dengan CSS `@media print`.
 */
export default function PrintableReport({ tasks = [], stats }) {
  const { user } = useAuth();

  return (
    <div className="print-only hidden bg-white p-2 text-[#111318]">
      {/* Kop Laporan */}
      <div className="border-b-2 border-[#111318] pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#52525B]">
              TaskFlow Workspace · Ujian Kompetensi Keahlian (PPLG/RPL)
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">
              Laporan Rekapitulasi Tugas Produktivitas
            </h1>
          </div>
          <div className="text-right font-mono text-[11px] text-[#52525B]">
            <p>Tanggal Cetak: {formatFullDateId()}</p>
            <p>Progres: {stats?.completion_rate ?? 0}% Selesai</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[#E6E6E2] pt-3 text-xs">
          <div>
            <span className="text-[#71717A]">Nama Peserta: </span>
            <span className="font-semibold">{user?.name || '-'}</span>
          </div>
          <div>
            <span className="text-[#71717A]">Kelas / Peran: </span>
            <span className="font-semibold">{user?.role || '-'}</span>
          </div>
          <div>
            <span className="text-[#71717A]">Email: </span>
            <span className="font-mono">{user?.email || '-'}</span>
          </div>
        </div>
      </div>

      {/* Ringkasan Angka */}
      <div className="my-5 grid grid-cols-4 gap-3 text-center">
        <div className="rounded border border-[#D4D4D8] p-2.5">
          <p className="text-[11px] text-[#52525B]">Total Tugas</p>
          <p className="font-mono text-lg font-bold">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded border border-[#D4D4D8] p-2.5">
          <p className="text-[11px] text-[#52525B]">Sedang Dikerjakan</p>
          <p className="font-mono text-lg font-bold">{stats?.in_progress ?? 0}</p>
        </div>
        <div className="rounded border border-[#D4D4D8] p-2.5">
          <p className="text-[11px] text-[#52525B]">Selesai</p>
          <p className="font-mono text-lg font-bold">{stats?.completed ?? 0}</p>
        </div>
        <div className="rounded border border-[#D4D4D8] p-2.5">
          <p className="text-[11px] text-[#52525B]">Terlambat</p>
          <p className="font-mono text-lg font-bold">{stats?.overdue ?? 0}</p>
        </div>
      </div>

      {/* Tabel Rekap Tugas */}
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b-2 border-[#111318] bg-[#F7F7F5]">
            <th className="px-2 py-2 font-semibold">No</th>
            <th className="px-2 py-2 font-semibold">Judul & Sub-Tugas</th>
            <th className="px-2 py-2 font-semibold">Kategori</th>
            <th className="px-2 py-2 font-semibold">Prioritas</th>
            <th className="px-2 py-2 font-semibold">Status</th>
            <th className="px-2 py-2 font-semibold">Tenggat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6E6E2]">
          {tasks.map((task, idx) => (
            <tr key={task.id} className="align-top">
              <td className="px-2 py-2 font-mono">{idx + 1}</td>
              <td className="px-2 py-2">
                <p className="font-semibold">
                  {task.title} {task.is_pinned ? '[Penting]' : ''}
                </p>
                {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-3 text-[11px] text-[#52525B]">
                    {task.subtasks.map((sub) => (
                      <li key={sub.id}>
                        [{sub.is_completed ? 'v' : ' '}] {sub.title}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="px-2 py-2">{task.category || 'Umum'}</td>
              <td className="px-2 py-2">{PRIORITY_META[task.priority]?.label || task.priority}</td>
              <td className="px-2 py-2">{STATUS_META[task.status]?.label || task.status}</td>
              <td className="px-2 py-2 font-mono">{formatShortDate(task.due_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
