// app/admin/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, CalendarDays, BarChart3, Settings, LogOut, Search, Bell, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  // State untuk sidebar, profil, dan menu mobile
  const [hasActiveEvent, setHasActiveEvent] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // <-- Saklar Menu HP

  useEffect(() => {
    const fetchSidebarData = async () => {
      // 1. Ambil nama admin dan foto Google
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAdminName(user.user_metadata?.full_name || 'Admin')
        setAvatarUrl(user.user_metadata?.avatar_url || '')
      }

      // 2. Cek apakah ada event absensi yang sedang aktif
      const { data: event } = await supabase.from('events').select('id').eq('is_active', true).single()
      if (event) setHasActiveEvent(true)
    }
    fetchSidebarData()
  }, [])

  // Otomatis tutup sidebar HP kalau pindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Data Kehadiran', icon: Users, path: '/admin/kehadiran' },
    { name: 'Jadwal & Event', icon: CalendarDays, path: '/admin/jadwal', showBadge: hasActiveEvent },
    { name: 'Laporan', icon: BarChart3, path: '/admin/laporan' },
    { name: 'Pengaturan', icon: Settings, path: '/admin/pengaturan' },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* OVERLAY GELAP UNTUK HP */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200 shadow-2xl md:shadow-sm transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img 
              src="/Logo.jpeg" 
              alt="Logo" 
              className="w-8 h-8 object-contain drop-shadow-sm" 
              onError={(e) => e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=HMBD&backgroundColor=2563eb'} 
            />
            <span className="font-bold text-slate-800 tracking-wide text-lg">HMBD Admin</span>
          </div>
          {/* Tombol Silang (Tutup) khusus di HP */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <Link key={item.name} href={item.path} 
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  {item.name}
                </div>
                {item.showBadge && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-white">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0">
          
          {/* Tombol Hamburger HP */}
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-slate-900 p-1">
              <Menu size={26} />
            </button>
            <span className="font-bold text-slate-800 text-lg">HMBD</span>
          </div>
          
          {/* Kotak Pencarian (Desktop) */}
          <div className="hidden md:flex relative w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Cari mahasiswa, event..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              {hasActiveEvent && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{adminName}</span>
              <img 
                src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${adminName}&backgroundColor=2563eb`} 
                alt="Admin" 
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shadow-sm object-cover" 
              />
            </div>
          </div>
        </header>

        {/* KONTEN */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50 relative">
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </main>
      </div>
    </div>
  )
}