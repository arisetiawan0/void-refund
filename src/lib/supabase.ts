import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan " +
      "VITE_SUPABASE_ANON_KEY di .env.local (lihat supabase/README.md)."
  )
}

/**
 * Client browser: anon key + sesi login user outlet/admin.
 * Keamanan data ditangani RLS di sisi Supabase, bukan di client.
 * Persist sesi di localStorage agar PWA tetap login setelah ditutup
 * (dulu sessionStorage mock; untuk outlet di lapangan lebih praktis persist).
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
