import { supabase } from "./supabase"
import type { AdminSession, Session } from "./types"
import type { User } from "@supabase/supabase-js"

/**
 * Auth Supabase:
 * - Outlet login: email sintetis "<OUTLET_ID>@outlet.internal" + password
 *   (ter-hash di Supabase Auth). Claim `outletId` di JWT dipakai RLS.
 * - Superadmin: user dengan claim `isAdmin` — login terpisah di /admin/login.
 * Rate limiting ditangani Supabase Auth di server (PRD §5 Keamanan).
 */

export const OUTLETS: readonly { id: string; nama: string }[] = Array.from(
  { length: 30 },
  (_, i) => {
    const n = String(i + 1).padStart(2, "0")
    return { id: `BT${n}`, nama: `Beauty ${n}` }
  }
)

export function outletEmail(outletId: string): string {
  return `${outletId.trim().toLowerCase()}@outlet.internal`
}

function userFrom(
  data: { user: User | null },
  error: { message: string } | null
): User | null {
  if (error) return null
  return data.user
}

export async function loginOutlet(
  outletId: string,
  password: string
): Promise<
  | { ok: true; session: Session }
  | { ok: false; error: string; retryIn?: number }
> {
  const id = outletId.trim().toUpperCase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: outletEmail(id),
    password,
  })
  const user = userFrom(data, error)
  if (!user) {
    return { ok: false, error: "Outlet ID atau password salah." }
  }
  const claims = (user.app_metadata as Record<string, unknown> | undefined) ?? {}
  const claimId = typeof claims.outletId === "string" ? claims.outletId : ""
  return { ok: true, session: { outletId: claimId || id } }
}

export async function loginAdmin(
  password: string
): Promise<
  | { ok: true; session: AdminSession }
  | { ok: false; error: string; retryIn?: number }
> {
  const email = "superadmin@ho.internal"
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  const user = userFrom(data, error)
  if (!user) {
    return { ok: false, error: "Password superadmin salah." }
  }
  const claims = (user.app_metadata as Record<string, unknown> | undefined) ?? {}
  if (claims.isAdmin !== true) {
    await supabase.auth.signOut()
    return { ok: false, error: "Akun ini bukan superadmin." }
  }
  return { ok: true, session: { user: "superadmin" } }
}

/** Ses dari Supabase (JWT) — sumber kebenaran outlet id saat ini. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null
  const claims = (user.app_metadata as Record<string, unknown> | undefined) ?? {}
  if (typeof claims.outletId !== "string" || !claims.outletId) {
    return null // admin / foreign user: bukan sesi outlet
  }
  return { outletId: claims.outletId }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null
  const claims = (user.app_metadata as Record<string, unknown> | undefined) ?? {}
  if (claims.isAdmin !== true) return null
  return { user: "superadmin" }
}

/**
 * Ganti password akun outlet yang sedang login (Supabase Auth updateUser).
 * Supabase memvalidasi password lama lewat sesi aktif; client tidak perlu
 * kredensial tambahan.
 */
export async function changeOutletPassword(
  currentPassword: string,
  newPassword: string
): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  // Re-authenticate dengan password lama supaya tidak mengganti password
  // dari sesi yang di-hijack (Supabase tidak punya re-auth bawaan).
  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData.session?.user?.email
  if (!email) return { ok: false, error: "Sesi berakhir. Silakan login ulang." }

  const check = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (check.error) {
    return { ok: false, error: "Password saat ini salah." }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { ok: false, error: error.message || "Gagal mengubah password." }
  }
  return { ok: true }
}

/** Pesan error rupanya sesi berakhir (token invalid/expired). */
export function isAuthError(msg: string | null | undefined): boolean {
  return !!msg && /JWT|session|expired|AuthApiError/i.test(msg)
}

export async function logoutOutlet() {
  await supabase.auth.signOut()
}

export async function logoutAdmin() {
  await supabase.auth.signOut()
}
