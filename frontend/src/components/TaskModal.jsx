import { useEffect, useState } from 'react';
import { Check, Pin, Plus, Trash2, X } from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '../utils/formatters';

/**
 * Komponen Modal Tugas (`TaskModal.jsx`)
 * --------------------------------------
 * Menangani operasi CREATE (buat tugas baru) maupun UPDATE (edit tugas & kelola sub-tugas/checklist).
 * Menggunakan State React berbentuk Associative Object untuk form utama dan Array of Objects untuk `subtasks`.
 */
export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  editingTask = null,
  initialDraft = null,
  availableCategories = [],
  saving = false,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('UKK Backend');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Array of Objects untuk daftar checklist sub-tugas di dalam tugas
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Menggabungkan kategori bawaan dan kategori kustom user tanpa duplikasi
  const mergedCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...availableCategories])
  );

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      const taskCategory = editingTask.category || 'Umum';
      const isKnownCategory = mergedCategories.includes(taskCategory);
      setCustomCategoryMode(!isKnownCategory);
      setCategory(isKnownCategory ? taskCategory : 'UKK Backend');
      setCustomCategory(isKnownCategory ? '' : taskCategory);
      setPriority(editingTask.priority || 'medium');
      setStatus(editingTask.status || 'todo');
      setDueDate(editingTask.due_date || '');
      setIsPinned(Boolean(editingTask.is_pinned));
      setSubtasks(
        Array.isArray(editingTask.subtasks)
          ? editingTask.subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            is_completed: Boolean(s.is_completed),
          }))
          : []
      );
    } else if (initialDraft) {
      setTitle(initialDraft.title || '');
      setDescription(initialDraft.description || '');
      const draftCategory = initialDraft.category || 'Umum';
      const isKnownDraftCat = mergedCategories.includes(draftCategory);
      setCustomCategoryMode(!isKnownDraftCat);
      setCategory(isKnownDraftCat ? draftCategory : 'UKK Backend');
      setCustomCategory(isKnownDraftCat ? '' : draftCategory);
      setPriority('medium');
      setStatus('todo');
      setDueDate(initialDraft.due_date || new Date().toISOString().slice(0, 10));
      setIsPinned(false);
      setSubtasks([]);
    } else {
      setTitle('');
      setDescription('');
      setCustomCategoryMode(false);
      setCategory('UKK Backend');
      setCustomCategory('');
      setPriority('medium');
      setStatus('todo');
      setDueDate(new Date().toISOString().slice(0, 10));
      setIsPinned(false);
      setSubtasks([]);
    }

    setNewSubtaskTitle('');
    setErrorMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTask, initialDraft]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        is_completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtaskLocal = (index) => {
    setSubtasks((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, is_completed: !item.is_completed } : item
      )
    );
  };

  const handleRemoveSubtaskLocal = (index) => {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const todayDateStr = new Date().toLocaleDateString('en-CA');

    if (title.trim().length < 2) {
      setErrorMsg('Judul tugas wajib diisi minimal 2 karakter.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Deskripsi tugas wajib diisi.');
      return;
    }

    if (dueDate && dueDate < todayDateStr) {
      setErrorMsg('Tenggat waktu tidak boleh memilih tanggal sebelum hari ini.');
      return;
    }

    const finalCategory = customCategoryMode
      ? customCategory.trim() || 'Umum'
      : category;

    // Mengirim payload terstruktur ke fungsi parent untuk CREATE / UPDATE via taskApi
    onSave({
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      priority,
      status,
      due_date: dueDate || null,
      is_pinned: isPinned,
      subtasks: subtasks.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        title: item.title.trim(),
        is_completed: Boolean(item.is_completed),
      })),
    });
  };

  const completedSubCount = subtasks.filter((s) => s.is_completed).length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] bg-white shadow-xl dark:border-[#252C3F] dark:bg-[#161B26] dark:shadow-2xl dark:shadow-black/50">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#EFECE4] bg-[#FAF7F0] px-6 py-4 dark:border-[#242B3D] dark:bg-[#11151F]">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#624CE0] dark:text-[#93C5FD]">
              {editingTask ? 'Mode Sunting Tugas' : 'Entri Tugas Baru'}
            </p>
            <h2
              id="task-modal-title"
              className="mt-0.5 text-base font-bold text-[#141518] dark:text-[#F8FAFC]"
            >
              {editingTask ? 'Perbarui Detail & Sub-Tugas' : 'Buat Tugas Baru'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isPinned
                  ? 'border-[#F0D981] bg-[#FBE67B] text-[#5C4104] dark:border-[#473B20] dark:bg-[#382D18] dark:text-[#FCD34D]'
                  : 'border-[#E6E0D4] bg-white text-[#71717A] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636]'
                }`}
            >
              <Pin className="h-3.5 w-3.5" />
              <span>{isPinned ? 'Disematkan' : 'Sematkan'}</span>
            </button>

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

        {/* Isi Form Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-6">
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Judul */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                Judul Tugas <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Contoh: Implementasi REST API Sanctum & Relasi Tabel"
                className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2.5 text-sm text-[#141518] placeholder-[#A1A1AA] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:placeholder-[#6B768F] dark:focus:border-[#60A5FA]"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                Deskripsi / Catatan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Jelaskan ruang lingkup, referensi, atau target pencapaian tugas..."
                className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2.5 text-sm text-[#141518] placeholder-[#A1A1AA] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:placeholder-[#6B768F] dark:focus:border-[#60A5FA]"
              />
            </div>

            {/* Baris Metadata */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                    Kategori
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomCategoryMode((prev) => !prev)}
                    className="text-[11px] font-semibold text-[#624CE0] hover:underline dark:text-[#93C5FD]"
                  >
                    {customCategoryMode ? 'Pilih dari daftar' : '+ Kategori kustom'}
                  </button>
                </div>

                {customCategoryMode ? (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ketik nama kategori baru..."
                    className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:bg-white focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                  >
                    {mergedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  Tenggat Waktu (Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 font-mono text-sm text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#3F3F46] dark:text-[#CBD5E1]">
                  Status Pengerjaan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3.5 py-2 text-sm text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bagian Sub-Tugas / Checklist */}
            <div className="rounded-2xl border border-[#E6E0D4] bg-[#FAF7F0] p-4 dark:border-[#242B3D] dark:bg-[#10141E]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#141518] dark:text-[#F1F5F9]">
                  Sub-Tugas / Checklist
                </label>
                <span className="rounded-full bg-[#E5DCFF] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#5B3FD6] dark:border dark:border-[#3A356B] dark:bg-[#232042] dark:text-[#C4B5FD]">
                  {completedSubCount}/{subtasks.length} selesai
                </span>
              </div>

              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Tambah langkah kerja (misal: Buat Migrasi Tabel)..."
                  className="flex-1 rounded-full border border-[#E6E0D4] bg-white px-3.5 py-1.5 text-xs text-[#141518] placeholder-[#A1A1AA] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#F1F5F9] dark:placeholder-[#6B768F] dark:focus:border-[#60A5FA]"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              </div>

              {subtasks.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {subtasks.map((item, idx) => (
                    <li
                      key={item.id || item.tempId || idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 dark:border-[#242B3D] dark:bg-[#161B26]"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtaskLocal(idx)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${item.is_completed
                              ? 'border-[#141518] bg-[#141518] text-white dark:border-[#93C5FD] dark:bg-[#93C5FD] dark:text-[#0F131D]'
                              : 'border-[#C7BFA9] dark:border-[#3B4661]'
                            }`}
                        >
                          {item.is_completed && <Check className="h-3 w-3" />}
                        </span>
                        <span
                          className={`truncate text-xs ${item.is_completed
                              ? 'text-[#71717A] line-through dark:text-[#6B768F]'
                              : 'font-medium text-[#141518] dark:text-[#F1F5F9]'
                            }`}
                        >
                          {item.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskLocal(idx)}
                        className="shrink-0 rounded-full p-1 text-[#71717A] hover:bg-rose-500/10 hover:text-rose-600 dark:text-[#9DA7BD] dark:hover:text-rose-400"
                        aria-label="Hapus sub-tugas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
                  Belum ada sub-tugas. Pecah tugas besar menjadi beberapa checklist kecil agar mudah dipantau.
                </p>
              )}
            </div>
          </div>

          {/* Footer Modal */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#EFECE4] bg-[#FAF7F0] px-6 py-3.5 dark:border-[#242B3D] dark:bg-[#11151F]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E6E0D4] bg-white px-4 py-2 text-xs font-semibold text-[#52525B] transition-colors hover:bg-[#EFECE4] hover:text-[#141518] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636] dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#141518] px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-[#93C5FD] dark:text-[#0F131D]"
            >
              {saving
                ? 'Menyimpan...'
                : editingTask
                  ? 'Simpan Perubahan'
                  : 'Simpan Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
