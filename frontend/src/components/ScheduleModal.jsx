import { useState } from 'react';
import { Calendar, Clock, ListPlus, MapPin, Paperclip, Trash2, Users, X } from 'lucide-react';

const COLOR_CHOICES = [
  { key: 'sand', label: 'Krem Hangat', swatch: 'bg-[#EAE6DC] border-[#D5CFC2]' },
  { key: 'yellow', label: 'Kuning Mentega', swatch: 'bg-[#F4D55B] border-[#E0BE3F]' },
  { key: 'blue', label: 'Biru Pastel', swatch: 'bg-[#B8CEF9] border-[#96B5F5]' },
  { key: 'pink', label: 'Merah Muda', swatch: 'bg-[#F7D1E7] border-[#E8AFD1]' },
  { key: 'green', label: 'Hijau Mint', swatch: 'bg-[#D8F0C8] border-[#B8DE9F]' },
];

const STATUS_CHOICES = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'in_progress', label: 'Sedang Berjalan' },
  { value: 'done', label: 'Selesai' },
];

export default function ScheduleModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConvertToTask,
  editingSchedule = null,
  defaultDate = '',
  saving = false,
}) {
  const [title, setTitle] = useState(editingSchedule?.title || '');
  const [location, setLocation] = useState(
    editingSchedule ? editingSchedule.location || '' : 'Lab PPLG 1, Ruang 312'
  );
  const [category, setCategory] = useState(editingSchedule?.category || 'Agenda UKK');
  const [date, setDate] = useState(
    () => editingSchedule?.date || defaultDate || new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState(editingSchedule?.start_time || '08:00');
  const [endTime, setEndTime] = useState(
    editingSchedule?.end_time || (editingSchedule ? '09:00' : '09:30')
  );
  const [color, setColor] = useState(editingSchedule?.color || (editingSchedule ? 'sand' : 'yellow'));
  const [status, setStatus] = useState(editingSchedule?.status || 'scheduled');
  const [participantsText, setParticipantsText] = useState(
    editingSchedule && Array.isArray(editingSchedule.participants)
      ? editingSchedule.participants.join(', ')
      : editingSchedule
      ? ''
      : 'AF, RN'
  );
  const [attachmentName, setAttachmentName] = useState(editingSchedule?.attachment_name || '');
  const [notes, setNotes] = useState(editingSchedule?.notes || '');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim().length < 2) {
      setErrorMsg('Judul agenda jadwal minimal terdiri dari 2 karakter.');
      return;
    }
    const todayDateStr = new Date().toLocaleDateString('en-CA');
    if (!date) {
      setErrorMsg('Tanggal pelaksanaan wajib dipilih.');
      return;
    }
    if (date < todayDateStr) {
      setErrorMsg('Tanggal pelaksanaan tidak boleh sebelum hari ini.');
      return;
    }

    const parsedParticipants = participantsText
      .split(',')
      .map((s) => s.trim().toUpperCase().slice(0, 4))
      .filter(Boolean)
      .slice(0, 8);

    onSave({
      title: title.trim(),
      location: location.trim() || 'Ruang Kerja',
      category: category.trim() || 'Agenda UKK',
      date,
      start_time: startTime,
      end_time: endTime,
      color,
      status,
      participants: parsedParticipants,
      attachment_name: attachmentName.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] bg-white shadow-xl dark:border-[#252C3F] dark:bg-[#161B26] dark:shadow-2xl dark:shadow-black/50">
        <div className="flex items-center justify-between border-b border-[#EFECE4] bg-[#FAF7F0] px-6 py-4 dark:border-[#242B3D] dark:bg-[#11151F]">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#C2418A] dark:text-[#93C5FD]">
              {editingSchedule ? 'Sunting Agenda' : 'Jadwal Baru'}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-[#141518] dark:text-[#F8FAFC]">
              {editingSchedule ? 'Perbarui Agenda Jadwal' : 'Tambah Agenda ke Jadwal'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {editingSchedule && onConvertToTask && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConvertToTask(editingSchedule);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-white px-3 py-1 text-xs font-semibold text-[#141518] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
              >
                <ListPlus className="h-3.5 w-3.5" />
                <span>Jadikan Tugas</span>
              </button>
            )}
            {editingSchedule && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(editingSchedule.id)}
                className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-[#71717A] hover:bg-[#EFECE4] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
              aria-label="Tutup modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-6">
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                Judul Agenda <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Contoh: Bimbingan UKK & Review API"
                className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2.5 text-sm text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  <MapPin className="h-3.5 w-3.5" />
                  Lokasi / Ruangan
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lab RPL 1, Ruang 312"
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  Kategori
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Bimbingan, Praktikum, Sidang..."
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  <Calendar className="h-3.5 w-3.5" />
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-2 font-mono text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  <Clock className="h-3.5 w-3.5" />
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-2 font-mono text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  <Clock className="h-3.5 w-3.5" />
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-2 font-mono text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  <Users className="h-3.5 w-3.5" />
                  Inisial Peserta (pisahkan koma)
                </label>
                <input
                  type="text"
                  value={participantsText}
                  onChange={(e) => setParticipantsText(e.target.value)}
                  placeholder="AF, RN, DS"
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 font-mono text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  Status Sesi
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                >
                  {STATUS_CHOICES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                <Paperclip className="h-3.5 w-3.5" />
                Nama Berkas Lampiran (opsional)
              </label>
              <input
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="Contoh: Agenda_UKK.pdf"
                className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
              />
            </div>

            {/* Warna Kartu Jadwal */}
            <div>
              <label className="mb-2 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                Warna Kartu Jadwal
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold text-[#141518] transition-transform ${
                      c.swatch
                    } ${
                      color === c.key
                        ? 'ring-2 ring-[#141518] ring-offset-1 dark:ring-[#93C5FD] dark:ring-offset-[#161B26]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan singkat agenda..."
                className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#EFECE4] bg-[#FAF7F0] px-6 py-3.5 dark:border-[#242B3D] dark:bg-[#11151F]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E6E0D4] bg-white px-4 py-2 text-xs font-semibold text-[#52525B] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#141518] px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60 dark:bg-[#93C5FD] dark:text-[#0F131D]"
            >
              {saving ? 'Menyimpan...' : editingSchedule ? 'Simpan Perubahan' : 'Tambah ke Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
