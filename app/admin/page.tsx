// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Users, FileDown, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [attendances, setAttendances] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, eventName: 'Memuat...', luarRadius: 0 })
  const [adminName, setAdminName] = useState('Admin') // State baru untuk nama Google
  const supabase = createClient()

  useEffect(() => {
    // --- FUNGSI AMBIL NAMA PROFIL GOOGLE ---
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Ambil nama depan (jika namanya panjang, kita potong ambil kata pertamanya saja biar rapi)
        const fullName = user.user_metadata?.full_name || 'Admin'
        const firstName = fullName.split(' ')[0]
        setAdminName(firstName)
      }
    }

    // --- FUNGSI AMBIL DATA DASHBOARD ---
    const fetchData = async () => {
      // 1. Ambil Event Aktif
      const { data: event } = await supabase.from('events').select('*, schedules(nama_kegiatan)').eq('is_active', true).single()
      
      if (event) {
        // 2. Ambil data absen yang sesuai dengan event aktif & gabungkan dengan tabel profiles
        const { data: records } = await supabase
          .from('attendances')
          .select('id, timestamp, status, profiles(full_name), latitude, longitude')
          .eq('event_id', event.id)
          .order('timestamp', { ascending: false })

        if (records) {
          // Format data agar sesuai dengan tabel
          const formattedRecords = records.map((record: any) => {
            const time = new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            
            // Supabase kadang membaca relasi sebagai array, kita pastikan ambil nama dengan aman
            const profileData = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
            const fullName = profileData?.full_name || 'Tanpa Nama'

            return {
              id: record.id,
              nama: fullName,
              waktu: `${time} WIB`,
              status: record.status,
              lokasi: 'Dalam Radius', 
              foto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`
            }
          })
          
          setAttendances(formattedRecords)
          setStats({
            total: records.length,
            eventName: event.schedules.nama_kegiatan,
            luarRadius: 0
          })
        }
      } else {
        setStats({ total: 0, eventName: 'Tidak Ada Event', luarRadius: 0 })
      }
    }

    fetchProfile()
    fetchData()
  }, [])

  // --- FUNGSI EXPORT CSV ---
  const handleExportCSV = () => {
    if (attendances.length === 0) {
      toast.error('Tidak ada data absensi untuk di-export.')
      return
    }

    const toastId = toast.loading('Menyiapkan file CSV...')

    const headers = ['Nama Mahasiswa', 'Waktu Absen', 'Status', 'Lokasi']
    const csvRows = attendances.map(row => 
      [`"${row.nama}"`, `"${row.waktu}"`, `"${row.status}"`, `"${row.lokasi}"`].join(',')
    )

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ringkasan_Absensi_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('File CSV berhasil diunduh!', { id: toastId })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Tombol Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Halo {adminName}! </h1>
          <p className="text-slate-500 text-sm">Dashboard terkoneksi dengan database Supabase.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <FileDown size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards Asli dari DB */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={24} /></div>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Total Kehadiran</p>
          <h3 className="text-3xl font-bold text-slate-800">{stats.total} Mahasiswa</h3>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle2 size={24} /></div>
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Event Aktif</p>
          <h3 className="text-3xl font-bold text-slate-800 leading-tight">{stats.eventName}</h3>
        </div>
      </div>

      {/* Tabel Data Asli */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800">Absensi Terbaru (Live)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Mahasiswa</th>
                <th className="px-6 py-4">Waktu Absen</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendances.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400">Belum ada data kehadiran.</td></tr>
              ) : (
                attendances.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img src={user.foto} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-100 object-cover" />
                      <span className="font-medium text-slate-800">{user.nama}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{user.waktu}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{user.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}