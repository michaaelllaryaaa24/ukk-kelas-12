import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Copy,
  ImagePlus,
  ListPlus,
  LocateFixed,
  Maximize2,
  Minus,
  Move,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  clearNotesApi,
  createNoteApi,
  deleteNoteApi,
  getNotesApi,
  updateNoteApi,
} from '../api/noteApi';
import { useToast } from '../context/useContexts';
import { extractApiErrorMessage } from '../utils/formatters';

/**
 * Palet warna kertas Sticky Notes yang lembut dan tenang (non-norak)
 */
const NOTE_THEMES = {
  blue: {
    label: 'Biru Note',
    dotBg: 'bg-[#60A5FA]',
    headerBg: 'bg-[#DFECFA] dark:bg-[#1B2C47]',
    bodyBg: 'bg-[#EDF5FE] dark:bg-[#152236]',
    border: 'border-[#C9DDF5] dark:border-[#2A4268]',
    text: 'text-[#1E293B] dark:text-[#E2EEFF]',
    muted: 'text-[#64748B] dark:text-[#8FB0E0]',
  },
  purple: {
    label: 'Ungu Note',
    dotBg: 'bg-[#8B5CF6]',
    headerBg: 'bg-[#EAE4FA] dark:bg-[#282247]',
    bodyBg: 'bg-[#F4F0FC] dark:bg-[#1E1A33]',
    border: 'border-[#D8CEF5] dark:border-[#3D336B]',
    text: 'text-[#1E1B4B] dark:text-[#EDE8FF]',
    muted: 'text-[#6B628D] dark:text-[#AC9FE2]',
  },
  pink: {
    label: 'Merah Muda',
    dotBg: 'bg-[#EC4899]',
    headerBg: 'bg-[#F7DFEC] dark:bg-[#382134]',
    bodyBg: 'bg-[#FBF0F6] dark:bg-[#291826]',
    border: 'border-[#ECC6DB] dark:border-[#57314F]',
    text: 'text-[#3F162B] dark:text-[#FFEBF7]',
    muted: 'text-[#87526E] dark:text-[#D99BC8]',
  },
  yellow: {
    label: 'Kuning Note',
    dotBg: 'bg-[#EAB308]',
    headerBg: 'bg-[#F7EBAD] dark:bg-[#362E18]',
    bodyBg: 'bg-[#FCF5CC] dark:bg-[#272213]',
    border: 'border-[#EDE096] dark:border-[#524624]',
    text: 'text-[#3B2E06] dark:text-[#FFF7D6]',
    muted: 'text-[#856F28] dark:text-[#D4BE7A]',
  },
  green: {
    label: 'Hijau Note',
    dotBg: 'bg-[#65A30D]',
    headerBg: 'bg-[#E3F1CC] dark:bg-[#1D3324]',
    bodyBg: 'bg-[#EFF8DF] dark:bg-[#15251A]',
    border: 'border-[#CFE4AC] dark:border-[#2C4D36]',
    text: 'text-[#1E3311] dark:text-[#E4FCE8]',
    muted: 'text-[#5C7A47] dark:text-[#86C798]',
  },
};

const COLOR_KEYS = ['blue', 'purple', 'pink', 'yellow', 'green'];
const NOTE_WIDTH = 256;
const NOTE_HEIGHT = 190;

/**
 * Mengompres file gambar (PNG/JPG/WEBP) menggunakan Canvas HTML5
 * agar ukuran penyimpanan di MySQL ringan dan cepat.
 */
function compressImageFileToDataUrl(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Berkas gambar tidak valid.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, 0.82);
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Komponen Papan Catatan Bebas (`StickyNotesBoard.jsx`)
 * ----------------------------------------------------
 * Kanvas catatan tempel interaktif tersambung penuh ke database MySQL:
 * - Drag & drop bebas posisi kartu di papan titik-titik
 * - Drag & drop file gambar langsung dari komputer ke papan maupun ke kartu catatan
 * - Unggah gambar via tombol atau Paste (Ctrl+V) screenshot langsung dari clipboard
 * - Auto-save judul, isi, warna, gambar, posisi, serta garis panah antar catatan
 */
export default function StickyNotesBoard({ onConvertToTask, onNotesCountChange, onNotesChange }) {
  const { showToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [zoom, setZoom] = useState(100);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const [dropTargetNoteId, setDropTargetNoteId] = useState(null);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);

  const canvasRef = useRef(null);
  const globalFileInputRef = useRef(null);
  const cardFileInputRefs = useRef({});
  const dragInfoRef = useRef(null);
  const debounceTimersRef = useRef({});

  const syncParentNotes = useCallback(
    (list) => {
      if (onNotesCountChange) onNotesCountChange(list.length);
      if (onNotesChange) onNotesChange(list);
    },
    [onNotesCountChange, onNotesChange]
  );

  useEffect(() => {
    let active = true;
    getNotesApi()
      .then((res) => {
        if (active) {
          const loaded = res.data || [];
          setNotes(loaded);
          syncParentNotes(loaded);
        }
      })
      .catch((error) => {
        if (active) {
          showToast(extractApiErrorMessage(error, 'Gagal memuat papan catatan.'), 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timers = debounceTimersRef.current;
    return () => {
      active = false;
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, [showToast, syncParentNotes]);

  const persistNoteUpdate = useCallback(
    async (noteId, payload) => {
      setSaveState('saving');
      try {
        await updateNoteApi(noteId, payload);
        setSaveState('saved');
      } catch (error) {
        setSaveState('idle');
        showToast(extractApiErrorMessage(error, 'Gagal menyimpan perubahan catatan.'), 'error');
      }
    },
    [showToast]
  );

  const scheduleAutoSave = useCallback(
    (noteId, payload) => {
      setSaveState('saving');
      if (debounceTimersRef.current[noteId]) {
        clearTimeout(debounceTimersRef.current[noteId]);
      }
      debounceTimersRef.current[noteId] = setTimeout(() => {
        persistNoteUpdate(noteId, payload);
      }, 550);
    },
    [persistNoteUpdate]
  );

  // Tambah Catatan Baru
  const handleAddNote = useCallback(
    async (preset = null) => {
      const offset = (notes.length % 6) * 28;
      const payload = preset || {
        title: 'Catatan Baru',
        content: 'Tulis ide atau seret gambar ke kartu ini...',
        color: COLOR_KEYS[notes.length % COLOR_KEYS.length],
        pos_x: 110 + offset,
        pos_y: 70 + offset,
      };

      setSaveState('saving');
      try {
        const res = await createNoteApi(payload);
        if (res?.data) {
          setNotes((prev) => {
            const next = [...prev, res.data];
            syncParentNotes(next);
            return next;
          });
          setSaveState('saved');
        }
      } catch (error) {
        setSaveState('idle');
        showToast(extractApiErrorMessage(error, 'Gagal membuat catatan baru.'), 'error');
      }
    },
    [notes.length, showToast, syncParentNotes]
  );

  // Menyisipkan Gambar ke Kartu Tertentu atau Membuat Kartu Bergambar Baru
  const attachImageToBoardOrNote = useCallback(
    async (file, targetNoteId = null, dropPos = null) => {
      if (!file || !file.type.startsWith('image/')) {
        showToast('Hanya file gambar (PNG, JPG, WEBP, GIF) yang didukung.', 'error');
        return;
      }

      setSaveState('saving');
      try {
        const compressedUrl = await compressImageFileToDataUrl(file);
        if (targetNoteId) {
          setNotes((prev) => {
            const next = prev.map((n) =>
              n.id === targetNoteId ? { ...n, image_data: compressedUrl } : n
            );
            syncParentNotes(next);
            return next;
          });
          await persistNoteUpdate(targetNoteId, { image_data: compressedUrl });
          showToast('Gambar berhasil disematkan ke catatan.');
        } else {
          const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'Catatan Gambar';
          await handleAddNote({
            title: cleanName.slice(0, 60),
            content: '',
            image_data: compressedUrl,
            color: COLOR_KEYS[notes.length % COLOR_KEYS.length],
            pos_x: dropPos?.x ?? 140 + (notes.length % 5) * 30,
            pos_y: dropPos?.y ?? 90 + (notes.length % 5) * 30,
          });
          showToast('Catatan bergambar baru ditambahkan ke papan.');
        }
      } catch (error) {
        setSaveState('idle');
        showToast(error?.message || 'Gagal memproses gambar.', 'error');
      }
    },
    [handleAddNote, notes.length, persistNoteUpdate, showToast, syncParentNotes]
  );

  // Dukungan Paste (Ctrl+V) screenshot / gambar langsung di Papan Catatan Bebas
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            attachImageToBoardOrNote(file, activeNoteId);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeNoteId, attachImageToBoardOrNote]);

  // Duplikasi Catatan
  const handleDuplicateNote = async (note) => {
    await handleAddNote({
      title: `${note.title} (Salinan)`,
      content: note.content || '',
      image_data: note.image_data || null,
      color: note.color || 'yellow',
      pos_x: (note.pos_x ?? 100) + 32,
      pos_y: (note.pos_y ?? 100) + 32,
    });
    showToast('Catatan berhasil diduplikasi.');
  };

  // Hapus Satu Catatan
  const handleDeleteNote = async (noteId) => {
    const previous = notes;
    setNotes((prev) => {
      const next = prev
        .filter((n) => n.id !== noteId)
        .map((n) => ({
          ...n,
          connected_to: Array.isArray(n.connected_to)
            ? n.connected_to.filter((targetId) => targetId !== noteId)
            : [],
        }));
      syncParentNotes(next);
      return next;
    });

    try {
      await deleteNoteApi(noteId);
      setSaveState('saved');
    } catch (error) {
      setNotes(previous);
      syncParentNotes(previous);
      showToast(extractApiErrorMessage(error, 'Gagal menghapus catatan.'), 'error');
    }
  };

  // Hapus Gambar dari Kartu Catatan
  const handleRemoveImageFromNote = async (noteId) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === noteId ? { ...n, image_data: null } : n));
      syncParentNotes(next);
      return next;
    });
    await persistNoteUpdate(noteId, { image_data: null });
    showToast('Gambar dihapus dari catatan.');
  };

  // Bersihkan Semua Catatan
  const handleClearAll = async () => {
    setConfirmClearAll(false);
    try {
      await clearNotesApi();
      setNotes([]);
      syncParentNotes([]);
      setConnectMode(false);
      setConnectSourceId(null);
      showToast('Papan catatan bebas berhasil dikosongkan.');
    } catch (error) {
      showToast(extractApiErrorMessage(error, 'Gagal membersihkan papan catatan.'), 'error');
    }
  };

  // Ubah teks judul / isi secara lokal + debounced auto-save
  const handleFieldChange = (noteId, field, value) => {
    setNotes((prev) => {
      const next = prev.map((note) => (note.id === noteId ? { ...note, [field]: value } : note));
      syncParentNotes(next);
      return next;
    });
    scheduleAutoSave(noteId, { [field]: value });
  };

  // Ubah warna kertas kartu
  const handleColorChange = (noteId, colorKey) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, color: colorKey } : note))
    );
    persistNoteUpdate(noteId, { color: colorKey });
  };

  // Mode Hubungkan Catatan
  const handleCardConnectClick = (noteId) => {
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(noteId);
      return;
    }
    if (connectSourceId === noteId) {
      setConnectSourceId(null);
      return;
    }

    const sourceNote = notes.find((n) => n.id === connectSourceId);
    if (!sourceNote) {
      setConnectSourceId(null);
      return;
    }

    const currentLinks = Array.isArray(sourceNote.connected_to) ? sourceNote.connected_to : [];
    const exists = currentLinks.includes(noteId);
    const nextLinks = exists
      ? currentLinks.filter((id) => id !== noteId)
      : [...currentLinks, noteId];

    setNotes((prev) =>
      prev.map((n) => (n.id === connectSourceId ? { ...n, connected_to: nextLinks } : n))
    );
    persistNoteUpdate(connectSourceId, { connected_to: nextLinks });
    setConnectSourceId(null);
    setConnectMode(false);
    showToast(exists ? 'Garis penghubung dilepas.' : 'Catatan berhasil dihubungkan.');
  };

  // Rapikan Posisi & Reset Zoom ke 100%
  const handleTidyAndCenter = async () => {
    setZoom(100);
    const cols = 3;
    const gapX = 284;
    const gapY = 230;

    const updated = notes.map((note, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        ...note,
        pos_x: 110 + col * gapX,
        pos_y: 45 + row * gapY,
      };
    });
    setNotes(updated);
    for (const item of updated) {
      persistNoteUpdate(item.id, { pos_x: item.pos_x, pos_y: item.pos_y });
    }
    showToast('Tata letak catatan dirapikan.');
  };

  // Pointer Dragging untuk memindahkan posisi sticky note
  const handleStartDrag = (e, note) => {
    if (connectMode) return;
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveNoteId(note.id);

    dragInfoRef.current = {
      id: note.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: note.pos_x ?? 80,
      origY: note.pos_y ?? 80,
      latestX: note.pos_x ?? 80,
      latestY: note.pos_y ?? 80,
    };
  };

  // Klik 2x area kosong kanvas untuk langsung menempelkan catatan baru
  const handleCanvasDoubleClick = (e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    const x = Math.max(40, Math.round((e.clientX - rect.left) / scale - NOTE_WIDTH / 2));
    const y = Math.max(24, Math.round((e.clientY - rect.top) / scale - 30));
    handleAddNote({
      title: 'Catatan Cepat',
      content: 'Tulis di sini...',
      color: COLOR_KEYS[notes.length % COLOR_KEYS.length],
      pos_x: x,
      pos_y: y,
    });
  };

  // Drop file gambar langsung dari komputer ke papan kanvas kosong
  const handleCanvasFileDrop = (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    setCanvasDragOver(false);

    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) {
      showToast('Silakan seret file gambar (PNG, JPG, WEBP).', 'error');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    const x = Math.max(40, Math.round((e.clientX - rect.left) / scale - NOTE_WIDTH / 2));
    const y = Math.max(24, Math.round((e.clientY - rect.top) / scale - 40));
    attachImageToBoardOrNote(file, null, { x, y });
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const drag = dragInfoRef.current;
      if (!drag) return;

      const scale = zoom / 100;
      const dx = (e.clientX - drag.startClientX) / scale;
      const dy = (e.clientY - drag.startClientY) / scale;

      const nextX = Math.max(24, Math.round(drag.origX + dx));
      const nextY = Math.max(20, Math.round(drag.origY + dy));
      drag.latestX = nextX;
      drag.latestY = nextY;

      setNotes((prev) =>
        prev.map((n) => (n.id === drag.id ? { ...n, pos_x: nextX, pos_y: nextY } : n))
      );
    };

    const handlePointerUp = () => {
      const drag = dragInfoRef.current;
      if (!drag) return;
      dragInfoRef.current = null;

      if (drag.latestX !== drag.origX || drag.latestY !== drag.origY) {
        persistNoteUpdate(drag.id, { pos_x: drag.latestX, pos_y: drag.latestY });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [zoom, persistNoteUpdate]);

  const scaleFactor = zoom / 100;

  return (
    <div className="space-y-4">
      {/* Input file tersembunyi untuk tombol Upload Gambar global */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) attachImageToBoardOrNote(file, null);
          e.target.value = '';
        }}
      />

      {/* Header Papan Catatan Bebas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#141518] dark:text-[#F1F5F9]">
              Papan Catatan Bebas
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-3 py-1 text-xs font-semibold text-[#52525B] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#CBD5E1]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4F9E65]" />
              {saveState === 'saving'
                ? 'Menyimpan...'
                : saveState === 'saved'
                ? 'Tersimpan ke MySQL'
                : 'Auto-save aktif'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#9DA7BD]">
            Seret catatan untuk mengatur posisi, atau seret / tempel (Ctrl+V) file gambar langsung ke papan atau ke kartu catatan.
          </p>
        </div>

        {/* Kontrol Zoom & Bersihkan Papan */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-white px-2 py-1 dark:border-[#242B3D] dark:bg-[#161B26]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(60, z - 10))}
              className="rounded-full p-1 text-[#52525B] transition-colors hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
              title="Perkecil papan"
              aria-label="Perkecil papan"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[44px] text-center font-mono text-xs font-semibold text-[#141518] dark:text-[#F1F5F9]">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(130, z + 10))}
              className="rounded-full p-1 text-[#52525B] transition-colors hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
              title="Perbesar papan"
              aria-label="Perbesar papan"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-[1px] bg-[#E6E0D4] dark:bg-[#2B3347]" />

            {confirmClearAll ? (
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                >
                  Hapus Semua
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#52525B] hover:bg-[#FAF7F0] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C]"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => notes.length > 0 && setConfirmClearAll(true)}
                disabled={notes.length === 0}
                className="rounded-full p-1 text-[#52525B] transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 dark:text-[#9DA7BD] dark:hover:text-rose-400"
                title="Bersihkan seluruh papan"
                aria-label="Bersihkan seluruh papan"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Banner Instruksi Mode Penghubung */}
      {connectMode && (
        <div className="flex items-center justify-between rounded-2xl border border-[#D5C6FF] bg-[#F4F0FC] px-4 py-2.5 text-xs font-medium text-[#3B2699] dark:border-[#333A63] dark:bg-[#1B1E33] dark:text-[#C4B5FD]">
          <span>
            {connectSourceId
              ? 'Sekarang klik catatan tujuan untuk membuat/melepas panah penghubung.'
              : 'Mode Hubungkan aktif: klik catatan asal terlebih dahulu.'}
          </span>
          <button
            type="button"
            onClick={() => {
              setConnectMode(false);
              setConnectSourceId(null);
            }}
            className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#141518] dark:bg-[#2C335A] dark:text-white"
          >
            Batal
          </button>
        </div>
      )}

      {/* Kanvas Titik-Titik Interaktif (Dropzone Gambar + Drag Kartu) */}
      <div
        ref={canvasRef}
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
            setCanvasDragOver(true);
          }
        }}
        onDragLeave={() => setCanvasDragOver(false)}
        onDrop={handleCanvasFileDrop}
        className={`dotted-board-bg relative h-[640px] w-full overflow-auto rounded-3xl border shadow-inner transition-colors ${
          canvasDragOver
            ? 'border-[#141518] ring-2 ring-[#141518]/20 dark:border-[#93C5FD] dark:ring-[#93C5FD]/30'
            : 'border-[#E6E0D4] dark:border-[#242B3D]'
        }`}
      >
        {/* Floating Left Pill Toolbar */}
        <div className="sticky left-4 top-4 z-30 float-left m-4 flex flex-col items-center gap-2 rounded-2xl border border-[#E6E0D4] bg-white/95 p-2 shadow-sm backdrop-blur-xs dark:border-[#242B3D] dark:bg-[#161B26]/95">
          <button
            type="button"
            onClick={() => handleAddNote()}
            title="Tambah sticky note baru"
            aria-label="Tambah sticky note baru"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141518] text-white transition-transform hover:scale-105 active:scale-95 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => globalFileInputRef.current?.click()}
            title="Tambah catatan bergambar dari komputer"
            aria-label="Upload gambar ke papan"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#52525B] transition-colors hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setConnectMode((prev) => !prev);
              setConnectSourceId(null);
            }}
            title="Hubungkan dua catatan dengan garis panah"
            aria-label="Hubungkan catatan"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              connectMode
                ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                : 'text-[#52525B] hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleTidyAndCenter}
            title="Rapikan tata letak & reset zoom 100%"
            aria-label="Rapikan catatan"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#52525B] transition-colors hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace Scaled Container */}
        <div
          onDoubleClick={handleCanvasDoubleClick}
          title="Klik 2x area kosong untuk catatan baru, atau seret gambar ke sini"
          className="relative min-h-[620px] min-w-[960px] origin-top-left transition-transform duration-150"
          style={{
            transform: `scale(${scaleFactor})`,
            width: `${Math.max(100, 100 / scaleFactor)}%`,
            height: `${Math.max(100, 100 / scaleFactor)}%`,
          }}
        >
          {/* Layer SVG Panah Penghubung Antar Catatan */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ minWidth: '1200px', minHeight: '800px' }}
          >
            <defs>
              <marker
                id="note-arrow-head"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L7,3 z" fill="#7E8BA3" />
              </marker>
            </defs>

            {notes.map((source) => {
              const links = Array.isArray(source.connected_to) ? source.connected_to : [];
              return links.map((targetId) => {
                const target = notes.find((n) => n.id === targetId);
                if (!target) return null;

                const x1 = (source.pos_x ?? 80) + NOTE_WIDTH / 2;
                const y1 = (source.pos_y ?? 80) + NOTE_HEIGHT / 2;
                const x2 = (target.pos_x ?? 80) + NOTE_WIDTH / 2;
                const y2 = (target.pos_y ?? 80) + NOTE_HEIGHT / 2;
                const cx = (x1 + x2) / 2;
                const cy = Math.min(y1, y2) - 45;

                return (
                  <path
                    key={`${source.id}-${target.id}`}
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke="#7E8BA3"
                    strokeWidth="1.75"
                    strokeDasharray="5 4"
                    markerEnd="url(#note-arrow-head)"
                    opacity="0.75"
                  />
                );
              });
            })}
          </svg>

          {loading ? (
            <div className="flex h-full items-center justify-center py-24">
              <span className="rounded-full border border-[#E6E0D4] bg-white px-4 py-2 font-mono text-xs text-[#71717A] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#9DA7BD]">
                Memuat papan catatan...
              </span>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-semibold text-[#141518] dark:text-[#F1F5F9]">
                Papan Catatan Bebas Masih Kosong
              </p>
              <p className="mt-1 max-w-md text-xs text-[#71717A] dark:text-[#9DA7BD]">
                Klik tombol <span className="font-semibold">+</span> di kiri, klik 2x area kosong,
                atau seret langsung file gambar dari komputer ke papan ini.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddNote()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tempel Catatan Pertama</span>
                </button>
                <button
                  type="button"
                  onClick={() => globalFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-white px-4 py-2 text-xs font-semibold text-[#141518] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#161B26] dark:text-[#E2E7F2] dark:hover:bg-[#1F2636]"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Sisipkan Gambar</span>
                </button>
              </div>
            </div>
          ) : (
            notes.map((note) => {
              const palette = NOTE_THEMES[note.color] || NOTE_THEMES.yellow;
              const isConnectSource = connectSourceId === note.id;
              const isImageDropHover = dropTargetNoteId === note.id;

              return (
                <div
                  key={note.id}
                  onMouseDown={() => setActiveNoteId(note.id)}
                  onClick={() => handleCardConnectClick(note.id)}
                  onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropTargetNoteId(note.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    setDropTargetNoteId(null);
                  }}
                  onDrop={(e) => {
                    if (e.dataTransfer?.files?.length) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropTargetNoteId(null);
                      const file = Array.from(e.dataTransfer.files).find((f) =>
                        f.type.startsWith('image/')
                      );
                      if (file) attachImageToBoardOrNote(file, note.id);
                    }
                  }}
                  style={{
                    left: `${note.pos_x ?? 80}px`,
                    top: `${note.pos_y ?? 80}px`,
                    width: `${NOTE_WIDTH}px`,
                    zIndex: activeNoteId === note.id ? 25 : 10,
                  }}
                  className={`group absolute flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
                    palette.bodyBg
                  } ${palette.border} ${
                    connectMode ? 'cursor-pointer ring-2 ring-[#141518]/25' : ''
                  } ${isConnectSource || isImageDropHover ? 'ring-2 ring-[#141518] dark:ring-white' : ''}`}
                >
                  {/* Input file khusus kartu ini */}
                  <input
                    ref={(el) => {
                      cardFileInputRefs.current[note.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) attachImageToBoardOrNote(file, note.id);
                      e.target.value = '';
                    }}
                  />

                  {/* Header Sticky Note (Drag Handle + Judul + Aksi Monokrom) */}
                  <div
                    onPointerDown={(e) => handleStartDrag(e, note)}
                    className={`flex cursor-grab items-center gap-1 px-3 py-2 active:cursor-grabbing ${palette.headerBg}`}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveNoteId(note.id);
                        dragInfoRef.current = {
                          id: note.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          origX: note.pos_x ?? 80,
                          origY: note.pos_y ?? 80,
                          latestX: note.pos_x ?? 80,
                          latestY: note.pos_y ?? 80,
                        };
                      }}
                      className={`cursor-grab rounded p-0.5 active:cursor-grabbing ${palette.muted} hover:text-[#141518] dark:hover:text-white`}
                      title="Geser posisi catatan"
                      aria-label="Geser catatan"
                    >
                      <Move className="h-3.5 w-3.5" />
                    </button>

                    <input
                      type="text"
                      value={note.title || ''}
                      onChange={(e) => handleFieldChange(note.id, 'title', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Judul catatan..."
                      className={`min-w-0 flex-1 bg-transparent text-xs font-bold focus:outline-none ${palette.text}`}
                    />

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cardFileInputRefs.current[note.id]?.click();
                        }}
                        title="Sisipkan / ganti gambar"
                        aria-label="Sisipkan gambar"
                        className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${palette.muted} hover:bg-black/5 hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white`}
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                      </button>
                      {onConvertToTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConvertToTask(note);
                          }}
                          title="Jadikan tugas To-Do"
                          aria-label="Jadikan tugas"
                          className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${palette.muted} hover:bg-black/5 hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white`}
                        >
                          <ListPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateNote(note);
                        }}
                        title="Duplikasi catatan"
                        aria-label="Duplikasi catatan"
                        className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${palette.muted} hover:bg-black/5 hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white`}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        title="Hapus catatan"
                        aria-label="Hapus catatan"
                        className={`rounded p-1 opacity-60 transition-opacity hover:bg-rose-500/15 hover:text-rose-600 group-hover:opacity-100 ${palette.muted}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Gambar jika ada */}
                  {note.image_data && (
                    <div className="group/img relative mx-3 mt-2.5 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10">
                      <img
                        src={note.image_data}
                        alt={note.title || 'Lampiran catatan'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageSrc(note.image_data);
                        }}
                        className="max-h-36 w-full cursor-zoom-in object-cover"
                      />
                      <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover/img:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageSrc(note.image_data);
                          }}
                          title="Perbesar gambar"
                          className="rounded-full bg-black/65 p-1 text-white hover:bg-black"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImageFromNote(note.id);
                          }}
                          title="Hapus gambar"
                          className="rounded-full bg-black/65 p-1 text-white hover:bg-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Isi Catatan Editable */}
                  <div className="px-3 pt-2.5 pb-1">
                    <textarea
                      rows={note.image_data ? 2 : 4}
                      value={note.content || ''}
                      onChange={(e) => handleFieldChange(note.id, 'content', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Tulis di sini atau seret gambar..."
                      className={`w-full resize-none bg-transparent text-xs leading-relaxed placeholder:opacity-60 focus:outline-none ${palette.text}`}
                    />
                  </div>

                  {/* Footer Warna & Label */}
                  <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                    <span className={`text-[10px] font-medium ${palette.muted}`}>
                      {palette.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {COLOR_KEYS.map((colorKey) => {
                        const cTheme = NOTE_THEMES[colorKey];
                        const isSelected = note.color === colorKey;
                        return (
                          <button
                            key={colorKey}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleColorChange(note.id, colorKey);
                            }}
                            title={cTheme.label}
                            aria-label={`Pilih warna ${cTheme.label}`}
                            className={`h-3 w-3 rounded-full transition-transform ${cTheme.dotBg} ${
                              isSelected
                                ? 'scale-110 ring-2 ring-[#141518]/45 ring-offset-1 dark:ring-white/70'
                                : 'opacity-75 hover:scale-110 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Lightbox Preview Gambar */}
      {previewImageSrc && (
        <div
          onClick={() => setPreviewImageSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#141518]"
          >
            <button
              type="button"
              onClick={() => setPreviewImageSrc(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
              aria-label="Tutup pratinjau gambar"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewImageSrc}
              alt="Pratinjau gambar catatan"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
