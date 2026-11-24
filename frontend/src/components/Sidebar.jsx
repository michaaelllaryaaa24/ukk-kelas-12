import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Pin,
  Settings,
  StickyNote,
  X,
} from 'lucide-react';
import { useAuth } from '../context/useContexts';
import UserAvatar from './UserAvatar';

/**
 * Komponen Sidebar Navigasi (`Sidebar.jsx`)
 * -----------------------------------------
 * Panel navigasi gelap mengambang (`#111214`) dengan sudut membulat (`rounded-[24px]`),
 * tombol collapse/expand bulat pink di tepi kanan, pengelompokan menu Umum & Alat,
 * indikator aktif vertikal pastel, serta tombol Log out di bagian bawah.
 */
export default function Sidebar({
  activeNav,
  onSelectNav,
  stats,
  notesCount = 0,
  schedulesCount = 0,
  collapsed = false,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, logout } = useAuth();

  /**
   * Multidimensional / Grouped Array of Objects:
   * Mengelompokkan item menu navigasi agar dirender rapi menggunakan `.map()`.
   */
  const navGroups = [
    {
      groupLabel: 'Umum',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, count: null },
        { id: 'schedule', label: 'Jadwal', icon: CalendarDays, count: schedulesCount },
        { id: 'all', label: 'Semua Tugas', icon: ListTodo, count: stats?.total ?? 0 },
        { id: 'today', label: 'Hari Ini', icon: Calendar, count: stats?.today ?? 0 },
        { id: 'upcoming', label: 'Mendatang', icon: CalendarClock, count: stats?.upcoming ?? 0 },
      ],
    },
    {
      groupLabel: 'Alat',
      items: [
        { id: 'pinned', label: 'Penting', icon: Pin, count: stats?.pinned ?? 0 },
        { id: 'completed', label: 'Selesai', icon: CheckCircle2, count: stats?.completed ?? 0 },
        { id: 'notes', label: 'Catatan Bebas', icon: StickyNote, count: notesCount },
        { id: 'settings', label: 'Pengaturan', icon: Settings, count: null },
      ],
    },
  ];

  const handleNavClick = (id) => {
    onSelectNav(id);
    if (onCloseMobile) onCloseMobile();
  };

  const renderSidebar = (isMobileDrawer = false) => {
    const isMini = collapsed && !isMobileDrawer;

    return (
      <aside
        className={`relative flex h-full flex-col justify-between rounded-[24px] bg-[#111214] py-5 text-[#F2F0EA] transition-all duration-200 dark:border dark:border-[#242B3D] dark:bg-[#131722] dark:text-[#E2E7F2] ${
          isMini ? 'w-[76px] px-2.5' : 'w-56 px-4'
        }`}
      >
        {/* Tombol Bulat Collapse/Expand di Tepi Kanan Sidebar */}
        {!isMobileDrawer && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isMini ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-label={isMini ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[#F4B8DC] text-[#111214] shadow-sm transition-transform hover:scale-110 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            {isMini ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <div>
          {/* Brand Logo */}
          <div className={`flex items-center ${isMini ? 'justify-center' : 'justify-between px-2'} pb-6`}>
            <button
              type="button"
              onClick={() => handleNavClick('overview')}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F4B8DC] text-[#111214] dark:border dark:border-[#343C52] dark:bg-[#222838] dark:text-white">
                <Layers className="h-4 w-4" />
              </div>
              {!isMini && (
                <div>
                  <span className="block text-lg font-bold leading-none tracking-tight text-white">
                    taskflow
                  </span>
                </div>
              )}
            </button>

            {isMobileDrawer && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-full p-1.5 text-[#A1A1AA] hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Kelompok Menu Navigasi */}
          <nav className="space-y-5" aria-label="Menu Ruang Kerja">
            {navGroups.map((group) => (
              <div key={group.groupLabel}>
                {!isMini && (
                  <p className="px-2.5 pb-2 text-[11px] font-medium text-[#6B6F7B]">
                    {group.groupLabel}
                  </p>
                )}

                <div className="space-y-0.5">
                  {/* Iterasi Array of Objects item menu menggunakan `.map()` */}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        title={isMini ? item.label : undefined}
                        className={`group relative flex w-full items-center rounded-xl py-2 text-left text-[13px] font-medium transition-colors ${
                          isMini ? 'justify-center px-2' : 'justify-between px-3'
                        } ${
                          isActive
                            ? 'text-[#F4B8DC] dark:bg-[#1C263B]/75 dark:text-[#93C5FD]'
                            : 'text-[#A0A4B0] hover:bg-white/5 hover:text-white dark:text-[#9DA7BD] dark:hover:bg-[#1C2232]'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F4B8DC] dark:bg-[#93C5FD]" />
                        )}

                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-[#F4B8DC] dark:text-[#93C5FD]'
                                : 'text-[#8C8F99] group-hover:text-white dark:text-[#8E98AF]'
                            }`}
                          />
                          {!isMini && <span>{item.label}</span>}
                        </span>

                        {!isMini && item.count !== null && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                              isActive
                                ? 'bg-[#F4B8DC]/15 text-[#F4B8DC] dark:bg-[#233352] dark:text-[#93C5FD]'
                                : 'text-[#717580] group-hover:text-[#D4D4D8] dark:text-[#7E889F]'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Tombol Log out sejajar gaya referensi */}
          <div className="mt-5 border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={logout}
              title="Keluar dari akun"
              className={`flex w-full items-center rounded-xl py-2 text-[13px] font-medium text-[#A0A4B0] transition-colors hover:bg-rose-500/15 hover:text-rose-300 ${
                isMini ? 'justify-center px-2' : 'gap-2.5 px-3'
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isMini && <span>Log out</span>}
            </button>
          </div>
        </div>

        {/* Profil Mini di Bagian Bawah */}
        <button
          type="button"
          onClick={() => handleNavClick('settings')}
          title={user?.name || 'Pengaturan Profil'}
          className={`flex items-center rounded-xl bg-white/5 p-2 text-left transition-colors hover:bg-white/10 ${
            isMini ? 'justify-center' : 'gap-2.5'
          }`}
        >
          <UserAvatar user={user} size="sm" />
          {!isMini && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.name || 'Pengguna'}
              </p>
              <p className="truncate text-[10px] text-[#8C8F99]">
                {user?.role || 'Siswa XII PPLG'}
              </p>
            </div>
          )}
        </button>
      </aside>
    );
  };

  return (
    <>
      {/* Floating Sidebar Desktop */}
      <div className="no-print hidden h-[calc(100vh-40px)] shrink-0 lg:sticky lg:top-4 lg:block">
        {renderSidebar(false)}
      </div>

      {/* Drawer Sidebar Mobile */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 flex p-3 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{renderSidebar(true)}</div>
        </div>
      )}
    </>
  );
}
