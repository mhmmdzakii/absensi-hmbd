// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 1. Ambil data user yang baru login
      const { data: { user } } = await supabase.auth.getUser()

      // 2. Cek Role di tabel profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      // 3. LOGIKA REDIRECT OTOMATIS
      // Jika Admin -> ke Dashboard. Jika Mahasiswa -> ke halaman Absen.
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      } else {
        return NextResponse.redirect(`${origin}/absen`)
      }
    }
  }

  // Jika gagal login
  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}