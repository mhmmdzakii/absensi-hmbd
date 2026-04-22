// app/admin/jadwal/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import QRCode from 'react-qr-code'
import { CalendarDays, PlayCircle, StopCircle, MapPin, Clock, Trash2, PlusCircle, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JadwalPage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState('')
  
  // State untuk Modal Tambah Jadwal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    nama_kegiatan: '', hari: 'Senin', jam_mulai: '08:00', jam_selesai: '10:00', 
    department_id: 1, latitude: -6.200000, longitude: 106.816666, radius: 50
  })

  const supabase = createClient()

  useEffect(() => {
    const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' })
    setCurrentDay(hariIni)
    fetchData(hariIni)
  }, [])

  const fetchData = async (hariIni: string) => {
    setLoading(true)
    const { data: scheduleData } = await supabase.from('schedules').select('*, departments(name)')
    
    if (scheduleData) {
      const sortedSchedules = scheduleData.sort((a, b) => {
        const isAToday = a.hari.toLowerCase() === hariIni.toLowerCase()
        const isBToday = b.hari.toLowerCase() === hariIni.toLowerCase()
        if (isAToday && !isBToday) return -1
        if (!isAToday && isBToday) return 1
        return 0
      })
      setSchedules(sortedSchedules)
    }

    const { data: eventData } = await supabase.from('events').select('*, schedules(nama_kegiatan)').eq('is_active', true).single()
    setActiveEvent(eventData || null)
    setLoading(false)
  }

  // --- FUNGSI TAMBAH JADWAL ---
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = toast.loading('Menyimpan jadwal baru...')
    
    const { error } = await supabase.from('schedules').insert([formData])
    
    if (!error) {
      toast.success('Jadwal berhasil ditambahkan!', { id: loadingToast })
      setIsModalOpen(false)
      fetchData(currentDay)
    } else {
      toast.error(`Gagal: ${error.message}`, { id: loadingToast })
    }
  }

  // --- FUNGSI MULAI EVENT ---
  const handleStartEvent = async (scheduleId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-slate-800">Mulai event absensi ini?</p>
        <div className="flex gap-2">
          <button onClick={async () => {
              toast.dismiss(t.id);
              const loadingToast = toast.loading('Membuka portal absensi...');
              await supabase.from('events').update({ is_active: false }).eq('is_active', true);
              const uniqueToken = `HMBD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              const { error } = await supabase.from('events').insert({
                schedule_id: scheduleId, tanggal: new Date().toISOString().split('T')[0], qr_token: uniqueToken, is_active: true
              });
              if (!error) {
                toast.success('Portal absensi berhasil dibuka!', { id: loadingToast });
                fetchData(currentDay);
              } else {
                toast.error('Gagal membuka portal.', { id: loadingToast });
              }
            }} 
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Ya, Mulai</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Batal</button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  // --- FUNGSI TUTUP EVENT ---
  const handleStopEvent = async () => {
    const loadingToast = toast.loading('Menutup portal absensi...')
    const { error } = await supabase.from('events').update({ is_active: false }).eq('id', activeEvent.id)
    if (!error) {
      toast.success('Portal absensi ditutup.', { id: loadingToast })
      fetchData(currentDay)
    } else {
      toast.error('Gagal menutup portal.', { id: loadingToast })
    }
  }

  // --- FUNGSI HAPUS JADWAL ---
  const handleDeleteSchedule = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-slate-800">Hapus jadwal ini permanen?</p>
        <div className="flex gap-2">
          <button onClick={async () => {
              toast.dismiss(t.id);
              const loadingToast = toast.loading('Menghapus jadwal...');
              const { error } = await supabase.from('schedules').delete().eq('id', id);
              if (!error) {
                toast.success('Jadwal dihapus!', { id: loadingToast });
                setSchedules(schedules.filter(s => s.id !== id));
              } else {
                toast.error('Gagal dihapus! Jadwal ini sudah memiliki data absensi mahasiswa.', { id: loadingToast, duration: 4000 });
              }
            }} 
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Hapus</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Batal</button>
        </div>
      </div>
    ))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Jadwal & QR Code</h1>
          <p className="text-slate-500 text-sm mt-1">Hari ini adalah hari <span className="font-bold text-blue-600 capitalize">{currentDay}</span>.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-all w-full sm:w-auto justify-center">
          <PlusCircle size={18} /> Tambah Jadwal Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Status Event Aktif & QR Code */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className={`p-4 border-b ${activeEvent ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeEvent ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${activeEvent ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                {activeEvent ? 'Portal Terbuka' : 'Portal Ditutup'}
              </h2>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center">
              {activeEvent ? (
                <>
                  <div className="mb-4 p-4 bg-white border border-slate-100 shadow-xl rounded-2xl">
                    <QRCode value={`${window.location.origin}/absen?token=${activeEvent.qr_token}`} size={220} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{activeEvent.schedules?.nama_kegiatan}</h3>
                  <p className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-md mb-6">{activeEvent.qr_token}</p>
                  
                  <button onClick={handleStopEvent} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                    <StopCircle size={20} /> Tutup Absensi
                  </button>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center text-slate-400">
                  <CalendarDays size={48} className="mb-4 opacity-50" />
                  <p className="font-medium">Pilih "Mulai Event"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Daftar Jadwal */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Daftar Jadwal Kegiatan</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Memuat jadwal...</div>
              ) : schedules.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Belum ada jadwal yang ditambahkan.</div>
              ) : (
                schedules.map((jadwal) => {
                  const isToday = jadwal.hari.toLowerCase() === currentDay.toLowerCase()
                  return (
                    <div key={jadwal.id} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border shadow-sm ${isToday ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          <span className="text-xs font-bold uppercase tracking-wider">{jadwal.hari.substring(0,3)}</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-800 text-lg">
                              {jadwal.nama_kegiatan}
                              <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] uppercase font-bold rounded-md border border-purple-100 align-middle">
                                {jadwal.departments?.name || 'Umum'}
                              </span>
                            </h4>
                            {isToday && <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><Sparkles size={10}/> HARI INI</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400"/> {jadwal.jam_mulai.substring(0,5)} - {jadwal.jam_selesai.substring(0,5)}</span>
                            <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400"/> Radius: {jadwal.radius}m</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                        <button onClick={() => handleDeleteSchedule(jadwal.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                        <button onClick={() => handleStartEvent(jadwal.id)} disabled={activeEvent?.schedule_id === jadwal.id}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                            activeEvent?.schedule_id === jadwal.id ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default' : isToday ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-md shadow-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                          }`}>
                          {activeEvent?.schedule_id === jadwal.id ? 'Sedang Berjalan' : <><PlayCircle size={18} /> Mulai Event</>}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL TAMBAH JADWAL (VERSI UI/UX PREMIUM) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-extrabold text-xl text-slate-800">Tambah Jadwal Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 shadow-sm p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body (Scrollable agar lega) */}
            <form onSubmit={handleAddSchedule} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Kegiatan</label>
                <input type="text" required placeholder="Misal: Kumpul Divisi PSDM" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" 
                  value={formData.nama_kegiatan} onChange={e => setFormData({...formData, nama_kegiatan: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Pilih Hari</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer" 
                  value={formData.hari} onChange={e => setFormData({...formData, hari: e.target.value})}>
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* DROPDOWN DEPARTEMEN */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Penanggung Jawab (Departemen)</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer" 
                  value={formData.department_id} onChange={e => setFormData({...formData, department_id: parseInt(e.target.value)})}>
                  <option value={1}>BPH</option>
                  <option value={2}>ORESBUD</option>
                  <option value={3}>PENDIDIKAN</option>
                  <option value={4}>Pengembangan Organisasi</option>
                  <option value={5}>AGAMA</option>
                  <option value={6}>KOMINFO</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Jam Mulai</label>
                  <input type="time" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer" 
                    value={formData.jam_mulai} onChange={e => setFormData({...formData, jam_mulai: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Jam Selesai</label>
                  <input type="time" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer" 
                    value={formData.jam_selesai} onChange={e => setFormData({...formData, jam_selesai: e.target.value})} />
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                  <MapPin size={16} /> Pengaturan Lokasi & Radius
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Radius Absen (Meter)</label>
                  <input type="number" required className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" 
                    value={formData.radius} onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Latitude</label>
                    <input type="number" step="any" required className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 text-sm" 
                      value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Longitude</label>
                    <input type="number" step="any" required className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 text-sm" 
                      value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-5 py-3.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button onClick={handleAddSchedule} className="flex-[2] px-5 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]">
                Simpan Jadwal
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  )
}