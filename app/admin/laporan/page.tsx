// app/admin/laporan/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, Users, Calendar, Download, Activity, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LaporanPage() {
  const [stats, setStats] = useState({ totalAbsen: 0, totalEvent: 0, rataRata: 0 })
  const [trendData, setTrendData] = useState<any[]>([])
  const [kegiatanData, setKegiatanData] = useState<any[]>([])
  const [rawRecords, setRawRecords] = useState<any[]>([]) // State baru untuk simpan data mentah export CSV
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  const fetchReportData = async () => {
    setLoading(true)
    
    // 1. Ambil semua data absensi beserta relasi event, jadwal, dan profile (untuk export)
    const { data: records, error } = await supabase
      .from('attendances')
      .select(`
        id, 
        timestamp, 
        status,
        profiles (full_name),
        events (
          tanggal,
          schedules (nama_kegiatan)
        )
      `)
      .order('timestamp', { ascending: false })

    if (records && records.length > 0) {
      setRawRecords(records) // Simpan untuk diexport

      // Hitung Total Data
      const totalAbsen = records.length
      
      // Proses Data untuk Grafik Tren (Berdasarkan Tanggal)
      const trendMap: Record<string, number> = {}
      // Proses Data untuk Grafik Kegiatan (Berdasarkan Nama Kegiatan)
      const kegiatanMap: Record<string, number> = {}
      
      const uniqueEvents = new Set()

      records.forEach((record: any) => {
        // Bypass TS checking untuk relasi
        const eventData = Array.isArray(record.events) ? record.events[0] : record.events
        const scheduleData = eventData?.schedules ? (Array.isArray(eventData.schedules) ? eventData.schedules[0] : eventData.schedules) : null
        
        if (eventData) {
          uniqueEvents.add(eventData.tanggal)
          
          // Agregasi Tren Harian
          const tanggal = new Date(eventData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
          trendMap[tanggal] = (trendMap[tanggal] || 0) + 1

          // Agregasi Kegiatan
          const namaKegiatan = scheduleData?.nama_kegiatan || 'Lainnya'
          kegiatanMap[namaKegiatan] = (kegiatanMap[namaKegiatan] || 0) + 1
        }
      })

      // Format data untuk Recharts
      const formattedTrend = Object.keys(trendMap).map(key => ({ tanggal: key, total: trendMap[key] }))
      const formattedKegiatan = Object.keys(kegiatanMap).map(key => ({ name: key, total: kegiatanMap[key] }))

      setTrendData(formattedTrend)
      setKegiatanData(formattedKegiatan)
      setStats({
        totalAbsen,
        totalEvent: uniqueEvents.size,
        rataRata: uniqueEvents.size > 0 ? Math.round(totalAbsen / uniqueEvents.size) : 0
      })
    } else {
      // Reset jika kosong
      setTrendData([])
      setKegiatanData([])
      setRawRecords([])
      setStats({ totalAbsen: 0, totalEvent: 0, rataRata: 0 })
    }
    setLoading(false)
  }

  useEffect(() => {
    // 1. Ambil data pertama kali halaman dimuat
    fetchReportData()

    // 2. AKTIFKAN RADAR REAL-TIME SUPABASE 🚀
    const channel = supabase.channel('realtime-reports-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances' }, (payload) => {
        toast.success('Data absensi baru masuk!', { icon: '🟢' })
        fetchReportData()
      })
      .subscribe()

    // Bersihkan radar saat pindah halaman
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // --- FUNGSI EXPORT LAPORAN CSV ---
  const handleExportLaporan = () => {
    if (rawRecords.length === 0) {
      toast.error('Tidak ada data laporan untuk diunduh.')
      return
    }

    const toastId = toast.loading('Menyiapkan Laporan Lengkap...')

    // Header untuk CSV
    const headers = ['Tanggal', 'Waktu', 'Nama Mahasiswa', 'Nama Kegiatan', 'Status Kehadiran']
    
    // Looping data mentah dan ubah jadi baris CSV
    const csvRows = rawRecords.map(record => {
      const dateObj = new Date(record.timestamp)
      const tanggal = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      const waktu = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      
      const profileData = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
      const nama = profileData?.full_name || 'Tanpa Nama'
      
      const eventData = Array.isArray(record.events) ? record.events[0] : record.events
      const scheduleData = eventData?.schedules ? (Array.isArray(eventData.schedules) ? eventData.schedules[0] : eventData.schedules) : null
      const kegiatan = scheduleData?.nama_kegiatan || 'Lainnya'

      return [`"${tanggal}"`, `"${waktu}"`, `"${nama}"`, `"${kegiatan}"`, `"${record.status || 'Hadir'}"`].join(',')
    })

    // Gabungkan Header dan Baris
    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan_Analitik_HMBD_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Laporan berhasil diunduh!', { id: toastId })
  }

  // Custom Tooltip untuk Grafik agar tampilannya premium
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-sm border border-slate-700">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            Total Hadir: <span className="font-bold text-lg">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Laporan Analitik <span className="relative flex h-3 w-3 ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Pantau tren kehadiran mahasiswa secara <span className="font-bold text-emerald-600">Real-Time</span>.</p>
        </div>
        <button 
          onClick={handleExportLaporan} 
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95">
          <Download size={18} /> Unduh Laporan Lengkap
        </button>
      </div>

      {/* KPI Cards (Key Performance Indicators) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Total Kehadiran</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalAbsen} <span className="text-sm font-medium text-slate-400">Data</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Event Berjalan</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalEvent} <span className="text-sm font-medium text-slate-400">Kegiatan</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Rata-Rata Kehadiran</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats.rataRata} <span className="text-sm font-medium text-slate-400">Org/Event</span></h3>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Tren Kehadiran (Line/Area Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Tren Kehadiran Harian</h3>
          </div>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-400">Memuat grafik...</div>
          ) : trendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-400">Belum ada data absensi yang cukup.</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Kehadiran Berdasarkan Kegiatan (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={18} className="text-purple-500"/> Kehadiran per Kegiatan</h3>
          </div>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-400">Memuat grafik...</div>
          ) : kegiatanData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-400">Belum ada data absensi yang cukup.</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kegiatanData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}