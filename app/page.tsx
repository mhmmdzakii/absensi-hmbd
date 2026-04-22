// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  // Langsung arahkan (redirect) siapapun yang membuka halaman utama ke portal absensi
  redirect('/absen')
}