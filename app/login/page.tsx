// app/login/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { ShieldCheck, ChevronRight } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setIsLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center relative overflow-hidden font-sans">
      
      {/* Dekorasi Background Halus (Biar gak flat banget) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl"></div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-[440px] px-4">
        
        {/* Container Utama */}
        <div className="bg-white border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[32px] p-8 md:p-12">
          
          {/* Header & Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl shadow-blue-500/10 flex items-center justify-center p-3 mb-6 animate-bounce-slow">
              <img
                src="/Logo.jpeg"
                alt="HMBD"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=HM&backgroundColor=2563eb'
                }}
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              HMBD <span className="text-blue-600 font-medium italic">Unik Lu</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Sistem Kehadiran & Manajemen Terpadu
            </p>
          </div>

          {/* Button Group */}
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center gap-3 py-4 px-4 bg-slate-900 text-white rounded-2xl font-semibold text-sm transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <div className="bg-white p-1 rounded-full">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  Masuk dengan Google
                  <ChevronRight size={16} className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </>
              )}
            </button>
          </div>

          {/* Info Smart Auth */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="flex items-start gap-4 bg-blue-50/50 p-4 rounded-2xl">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <ShieldCheck size={18} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-blue-700 block mb-0.5">Akses Terdeteksi</span>
                Sistem akan otomatis menentukan dashboard yang sesuai dengan identitas akun Anda.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">
            Official Attendance System
          </p>
          <p className="text-xs font-semibold text-slate-500">
            Himpunan Mahasiswa Bisnis Digital
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}