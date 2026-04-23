// app/absen/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import imageCompression from 'browser-image-compression'
import { getDistanceInMeters } from '@/utils/haversine'
import { MapPin, ScanFace, CalendarCheck, Clock, Navigation, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- DAFTAR EMAIL ADMIN (BISA MENEMBUS BLOKIR LAPTOP) ---
const ADMIN_EMAILS = [
  'saturnusno6@gmail.com', 
  'admin2@gmail.com', // Ganti dengan email admin tambahan
  'admin3@gmail.com'  // Tambahkan lagi jika perlu
]

// --- DATA MASTER PENGURUS HMBD ---
const DEPARTEMEN = {
  1: "BPH", 2: "ORESBUD", 3: "PENDIDIKAN", 4: "Pengembangan Organisasi", 5: "AGAMA", 6: "KOMINFO"
}
const DATA_PENGURUS: Record<number, string[]> = {
  1: ["Zahra Rohadatul ‘Aisylah", "Muchamad Rizky Daemawan", "Muhammad Zaki Amali", "Elis Siti Kholisoh", "Indah Nur Azizah", "Intan Farahita"],
  2: ["Muthyara Rahma", "Ahmad Marjuki", "Farel Valentino", "Ihsan Nur Iskandar", "Rara Sulistiawati", "Naya Astria Putri", "Mohamad Razza Naufal", "Azril Gias Irvansyah", "Muhammad Azzam Muzhaff", "M. Raihan Al-Mughni", "Raihan Audika Kurnia"],
  3: ["Zaki Adnan Al-Latif", "Muhammad Rizky", "Triya Nur Auliya", "Lena Nuroktavia", "Ridho Anugrah", "Adam Adi Hidayat", "M. Raihan Affandi", "Dea Nida Ramadani", "Giava Agna Abnatul Mala"],
  4: ["Muhammad Yusuf", "Dewi Sintya", "Nur Afifah Azzahra", "Ziyan Jamal Maulana", "Muhammad Bagus Sanjiwa", "Lisa Bruari Junlim", "Anggun Putri Cahyani", "Ferdiansyah Saputra", "Raihanur Meilani Elfariyani", "Gadis Laurenza"],
  5: ["Dimas Sandy Styawan", "Jandi Januarta", "Raffel Ravindo", "Aisha Naufati", "Mutia Azahra", "Arifudin Malik", "Muhammad Raihan Syah Al-Faridz"],
  6: ["Pasha Pramudya Albani", "Tifa Sufiati Istiqomah", "Diandra Pratama", "Muhammad Arther Maladz", "Ilyas Saputra", "Salwa Salsabila", "Dwi Wulandari", "Elda Ajeng Adyla"]
}

export default function AbsensiPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [user, setUser] = useState<any>(null)
  const [officialName, setOfficialName] = useState('')
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMobile, setIsMobile] = useState(true)
  
  const [needsSetup, setNeedsSetup] = useState(false)
  const [selectedDept, setSelectedDept] = useState<number>(0)
  const [selectedName, setSelectedName] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('department_id, full_name').eq('id', user.id).single()
        
        if (!profile?.department_id) {
          setNeedsSetup(true)
        } else {
          setOfficialName(profile.full_name)
        }
      }

      const { data: eventData } = await supabase
        .from('events')
        .select('*, schedules(latitude, longitude, radius, nama_kegiatan)')
        .eq('is_active', true)
        .single()
      
      setActiveEvent(eventData || null)
    }

    fetchInitialData()

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    const channel = supabase.channel('realtime-events-mahasiswa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchInitialData()
      })
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSaveProfile = async () => {
    if (!selectedDept || !selectedName) {
      setMessage({ type: 'error', text: 'Pilih Departemen dan Nama Anda!' })
      return
    }
    setLoading(true)
    const { error } = await supabase.from('profiles')
      .update({ department_id: selectedDept, full_name: selectedName })
      .eq('id', user.id)
    
    if (!error) {
      setOfficialName(selectedName)
      setNeedsSetup(false)
      setMessage({ type: '', text: '' })
    } else {
      setMessage({ type: 'error', text: 'Gagal menyimpan profil.' })
    }
    setLoading(false)
  }

  const handleAbsen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (!activeEvent) throw new Error('Tidak ada jadwal aktif.')

      setMessage({ type: 'info', text: 'Mendapatkan lokasi...' })
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      })

      const distance = getDistanceInMeters(
        pos.coords.latitude, pos.coords.longitude, 
        activeEvent.schedules.latitude, activeEvent.schedules.longitude
      )
      
      if (distance > activeEvent.schedules.radius) {
        throw new Error(`Anda di luar jangkauan (${Math.round(distance)}m dari lokasi).`)
      }

      setMessage({ type: 'info', text: 'Memproses foto...' })
      const compressedFile = await imageCompression(e.target.files[0], { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true })

      setMessage({ type: 'info', text: 'Menyimpan...' })
      const filePath = `${activeEvent.id}/${user?.id}/${new Date().getTime()}.jpg`
      const { error: uploadError } = await supabase.storage.from('attendance_photos').upload(filePath, compressedFile)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('attendance_photos').getPublicUrl(filePath)

      const { error: dbError } = await supabase.from('attendances').insert({
        user_id: user?.id,
        event_id: activeEvent.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        photo_url: publicUrlData.publicUrl
      })

      if (dbError) {
        if (dbError.code === '23505') throw new Error('Anda sudah absen hari ini.')
        throw dbError
      }

      setMessage({ type: 'success', text: 'Berhasil Absen!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setLoading(false)
    }
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 font-sans">
        <div className="w-full max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <UserCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Lengkapi Profil</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Pilih identitas Anda. Data ini akan dikunci dan dikaitkan dengan email Google Anda secara permanen.</p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Pilih Departemen</label>
              <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900" 
                value={selectedDept} onChange={e => { setSelectedDept(parseInt(e.target.value)); setSelectedName(''); }}>
                <option value={0} disabled>-- Pilih Departemen --</option>
                {Object.entries(DEPARTEMEN).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            {selectedDept > 0 && (
              <div className="animate-in fade-in zoom-in duration-300">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Pilih Nama Anda</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900" 
                  value={selectedName} onChange={e => setSelectedName(e.target.value)}>
                  <option value="" disabled>-- Pilih Nama Pengurus --</option>
                  {DATA_PENGURUS[selectedDept].sort().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {message.text && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 text-center">
                {message.text}
              </div>
            )}

            <button onClick={handleSaveProfile} disabled={loading || !selectedName} 
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-blue-200">
              {loading ? 'Menyimpan...' : 'Kunci Profil & Lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-32 md:items-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-sm relative">
        
        <div className="bg-blue-600 rounded-b-[2.5rem] p-6 pb-12 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white/50" />
              )}
              <div className="text-white">
                <p className="text-xs text-blue-200">Halo,</p>
                <p className="font-bold text-sm tracking-wide line-clamp-1">{officialName || 'Mahasiswa'}</p>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-medium shrink-0">
              Keluar
            </button>
          </div>
          <div className="text-center text-white">
            <p className="text-5xl font-extrabold tracking-tighter mb-1">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-blue-100 font-medium">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="px-6 -mt-8 relative z-10 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Status Kegiatan</h3>
            {activeEvent ? (
              <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h2 className="text-gray-900 font-bold text-lg leading-tight mb-1">{activeEvent.schedules.nama_kegiatan}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <MapPin size={12} className="text-emerald-500" /> Wajib di Area Kampus
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400"><Clock size={24} /></div>
                <p className="text-gray-500 font-medium">Belum ada kegiatan</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Navigation size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-800">Deteksi Lokasi GPS</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Sistem akan meminta izin lokasi saat Anda menekan tombol absen di bawah.</p>
          </div>

          {message.text && (
            <div className={`p-4 rounded-2xl text-sm font-medium border ${
              message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="fixed md:absolute bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-6 pb-8 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] rounded-t-3xl z-50">
          {/* LOGIKA BLOKIR LAPTOP DENGAN DAFTAR PUTIH ADMIN */}
          {(!isMobile && !ADMIN_EMAILS.includes(user?.email)) ? (
            <div className="w-full py-4 text-center bg-red-50 text-red-600 rounded-2xl font-bold text-sm border border-red-100">
              ⚠️ Absensi hanya dapat dilakukan melalui Smartphone.
            </div>
          ) : (
            <label className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-transform active:scale-95 cursor-pointer shadow-lg
              ${loading || !activeEvent ? 'bg-gray-100 text-gray-400 shadow-none pointer-events-none' : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700'}`}>
              <ScanFace size={22} className={loading ? 'animate-pulse' : ''} />
              {loading ? 'Memproses...' : 'Scan Wajah & Absen'}
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleAbsen} disabled={loading || !activeEvent} />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}