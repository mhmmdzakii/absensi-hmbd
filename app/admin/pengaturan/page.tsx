// app/admin/pengaturan/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, ShieldAlert, Save, Database, Trash2, Bell, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState('profil')
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setFullName(user.user_metadata?.full_name || '')
      }
    }
    fetchProfile()
  }, [])

  // --- FUNGSI UPDATE PROFIL ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const loadingToast = toast.loading('Memperbarui profil...')

    // Update metadata di Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    // Update nama di tabel profiles
    if (!authError && user) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
      toast.success('Profil berhasil diperbarui!', { id: loadingToast })
      // Refresh halaman agar nama di Topbar ikut berubah
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast.error('Gagal memperbarui profil.', { id: loadingToast })
    }
    setLoading(false)
  }

  // --- FUNGSI DANGER ZONE (RESET DATA) ---
  const handleResetData = async () => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-red-600">Peringatan Keras!</p>
        <p className="text-sm text-slate-700">Tindakan ini akan menghapus <b>SELURUH</b> data absensi mahasiswa secara permanen. Lanjutkan?</p>
        <div className="flex gap-2 mt-2">
          <button onClick={async () => {
              toast.dismiss(t.id);
              const loadingToast = toast.loading('Menghapus seluruh data absensi...');
              // Hapus semua data di tabel attendances
              const { error } = await supabase.from('attendances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              if (!error) {
                toast.success('Semua data absensi berhasil dibersihkan!', { id: loadingToast });
              } else {
                toast.error('Gagal membersihkan data.', { id: loadingToast });
              }
            }} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">Ya, Hapus Semua</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Batal</button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola preferensi akun admin dan konfigurasi sistem HMBD.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigasi Pengaturan */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col gap-1">
            <button onClick={() => setActiveTab('profil')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profil' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <User size={18} className={activeTab === 'profil' ? 'text-blue-600' : 'text-slate-400'} /> Profil Admin
            </button>
            <button onClick={() => setActiveTab('sistem')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'sistem' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Database size={18} className={activeTab === 'sistem' ? 'text-blue-600' : 'text-slate-400'} /> Preferensi Sistem
            </button>
            <div className="h-px bg-slate-100 my-2 mx-4"></div>
            <button onClick={() => setActiveTab('danger')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'danger' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-red-50 hover:text-red-600'}`}>
              <ShieldAlert size={18} className={activeTab === 'danger' ? 'text-red-600' : 'text-slate-400'} /> Zona Berbahaya
            </button>
          </div>
        </div>

        {/* Konten Utama Pengaturan */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            
            {/* TAB: PROFIL */}
            {activeTab === 'profil' && (
              <div className="animate-in fade-in duration-300">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">Informasi Pribadi</h2>
                  <p className="text-slate-500 text-sm">Perbarui foto dan detail identitas Anda di sini.</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-6 max-w-xl space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-md object-cover bg-slate-100" />
                      <span className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full border-2 border-white text-white shadow-sm cursor-pointer hover:bg-blue-700 transition-colors">
                        <User size={14} />
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{fullName || 'Admin'}</h3>
                      <p className="text-slate-500 text-sm">{user?.email}</p>
                      <span className="inline-block mt-2 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 uppercase tracking-wider">Administrator</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Alamat Email (Google)</label>
                      <input type="email" value={user?.email || ''} disabled
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><ShieldAlert size={12}/> Email dikunci karena menggunakan sistem Login Google OAuth.</p>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70">
                      <Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: SISTEM */}
            {activeTab === 'sistem' && (
              <div className="animate-in fade-in duration-300">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">Preferensi Sistem</h2>
                  <p className="text-slate-500 text-sm">Pengaturan tampilan dan notifikasi dashboard.</p>
                </div>
                <div className="p-6 space-y-6 max-w-xl">
                  {/* Dummy Toggles for UI realism */}
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><Bell size={20} /></div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Notifikasi Real-time</h4>
                        <p className="text-xs text-slate-500">Bunyikan suara saat ada absensi masuk.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><Smartphone size={20} /></div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Kompresi Foto Otomatis</h4>
                        <p className="text-xs text-slate-500">Kurangi ukuran foto selfie mahasiswa di bawah 500KB.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked disabled />
                      <div className="w-11 h-6 bg-blue-600 opacity-70 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[22px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 italic mt-2">*Beberapa fitur dikunci karena merupakan pengaturan inti sistem.</p>
                </div>
              </div>
            )}

            {/* TAB: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="animate-in fade-in duration-300">
                <div className="p-6 border-b border-red-100 bg-red-50/30">
                  <h2 className="text-lg font-bold text-red-700 flex items-center gap-2"><ShieldAlert size={20}/> Zona Berbahaya</h2>
                  <p className="text-red-500/80 text-sm">Harap berhati-hati. Tindakan di area ini tidak dapat dibatalkan.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border border-red-200 rounded-xl bg-white shadow-sm">
                    <div>
                      <h4 className="font-bold text-slate-800">Reset Data Semester</h4>
                      <p className="text-sm text-slate-500 mt-1 max-w-md">Menghapus seluruh riwayat data absensi mahasiswa di database. Gunakan ini hanya saat pergantian semester baru atau acara tahunan baru.</p>
                    </div>
                    <button onClick={handleResetData} className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors">
                      <Trash2 size={18} /> Bersihkan Data
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}