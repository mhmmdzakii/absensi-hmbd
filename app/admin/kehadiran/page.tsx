// app/admin/kehadiran/page.tsx
'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { Search, FileDown, Filter, MapPin, Calendar as CalendarIcon } from 'lucide-react'

export default function KehadiranPage() {
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  // app/admin/kehadiran/page.tsx

  useEffect(() => {
    fetchAttendances()

    // AKTIFKAN RADAR REAL-TIME SUPABASE 🚀
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', 
          schema: 'public',
          table: 'attendances',
        },
        (payload) => {
          toast.success('Ada mahasiswa baru saja absen!', { icon: '📸' })
          fetchAttendances() // Refresh tabel otomatis
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAttendances = async () => {
    setLoading(true)
    // Query untuk mengambil data kehadiran beserta relasi user dan event-nya
    const { data: records, error } = await supabase
      .from('attendances')
      .select(`
        id, 
        timestamp, 
        status, 
        latitude, 
        longitude,
        photo_url,
        profiles (full_name),
        events (
          schedules (nama_kegiatan)
        )
      `)
      .order('timestamp', { ascending: false })

    if (records) {
      const formattedRecords = records.map((record: any) => {
        const profileData = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
        const eventData = Array.isArray(record.events) ? record.events[0] : record.events
        const scheduleData = eventData?.schedules ? (Array.isArray(eventData.schedules) ? eventData.schedules[0] : eventData.schedules) : null
        
        const dateObj = new Date(record.timestamp)
        const date = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        const time = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

        return {
          id: record.id,
          nama: profileData?.full_name || 'Tanpa Nama',
          kegiatan: scheduleData?.nama_kegiatan || 'Event Tidak Diketahui',
          tanggal: date,
          waktu: `${time} WIB`,
          status: record.status,
          koordinat: `${record.latitude}, ${record.longitude}`,
          foto: record.photo_url
        }
      })
      setAttendances(formattedRecords)
    }
    setLoading(false)
  }

  // Fungsi untuk Export CSV Asli
  const handleExportCSV = () => {
    if (attendances.length === 0) return alert('Tidak ada data untuk diexport.')

    // 1. Buat Header Kolom
    const headers = ['Nama Mahasiswa', 'Kegiatan', 'Tanggal', 'Waktu', 'Status', 'Koordinat GPS']
    
    // 2. Map data ke format baris CSV
    const csvRows = attendances.map(row => 
      [
        `"${row.nama}"`, 
        `"${row.kegiatan}"`, 
        `"${row.tanggal}"`, 
        `"${row.waktu}"`, 
        `"${row.status}"`,
        `"${row.koordinat}"`
      ].join(',')
    )

    // 3. Gabungkan Header dan Baris
    const csvContent = [headers.join(','), ...csvRows].join('\n')
    
    // 4. Proses Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Rekap_Absensi_HMBD_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Logika Pencarian
  const filteredData = attendances.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.kegiatan.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header & Tools */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Data Kehadiran</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola dan pantau seluruh riwayat absensi kegiatan HMBD.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama atau kegiatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Filter size={18} /> <span className="hidden sm:block">Filter</span>
          </button>
          <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95">
            <FileDown size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Mahasiswa</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Bukti Foto</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Memuat data absensi...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Tidak ada data yang ditemukan.</td></tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.nama}`} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" alt="Avatar" />
                        <span className="font-medium text-slate-800">{row.nama}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{row.kegiatan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <CalendarIcon size={14} /> {row.tanggal}
                      </div>
                      <div className="font-medium text-slate-800">{row.waktu}</div>
                    </td>
                    <td className="px-6 py-4">
                      {row.foto ? (
                        <a href={row.foto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline underline-offset-2">
                          Lihat Foto
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {row.status}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                        <MapPin size={10} /> {row.koordinat.substring(0, 16)}...
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Dummy Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan {filteredData.length} data absensi</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100">Sebelumnya</button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100">Selanjutnya</button>
          </div>
        </div>
      </div>

    </div>
  )
}