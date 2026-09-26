#!/usr/bin/env node
/**
 * Membuat user auth Supabase untuk aplikasi void & refund:
 * - 1 user per outlet (email "<ID>@outlet.internal") + row di public.outlets
 * - 1 superadmin dengan JWT claim isAdmin: true
 *
 * Pakai service_role key (server-side saja, JANGAN commit).
 *
 * Pemakaian:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE=eyJ... \
 *   node scripts/create-users.mjs
 *
 * Password default bisa dioverride lewat env OUTLET_PASSWORD / ADMIN_PASSWORD.
 * Aman dipanggil ulang (idempotent).
 *
 * Catatan: JWT custom claim (outletId / isAdmin) diambil dari app_metadata.
 * app_metadata ikut ter-embed di access token JWT sehingga RLS bisa membacanya
 * lewat request.jwt.claims.
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE

if (!url || !serviceRole) {
  console.error(
    "Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE dulu.\n" +
      "Contoh:\n" +
      "  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE=eyJ... node scripts/create-users.mjs"
  )
  process.exit(1)
}

const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false } })

const OUTLETS = Array.from({ length: 30 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0")
  return { id: `BT${n}`, nama: `Beauty ${n}` }
})

const OUTLET_PASSWORD = process.env.OUTLET_PASSWORD ?? "outlet01"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin01"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "superadmin@ho.internal"

function repo(output) {
  // Ganti 2 error umum jadi info: user sudah ada / email sudah terdaftar
  if (output.error) {
    const msg = String(output.error.message ?? output.error)
    if (/already|registered|exists|duplicate/i.test(msg)) return { ok: true, msg }
    return { ok: false, msg }
  }
  return { ok: true }
}

async function ensureOutlet(outlet) {
  const email = `${outlet.id.toLowerCase()}@outlet.internal`

  // 1) User auth
  let { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  let user = list?.users?.find((u) => u.email === email)

  if (!user) {
    const res = await admin.auth.admin.createUser({
      email,
      password: OUTLET_PASSWORD,
      email_confirm: true,
      user_metadata: { outletId: outlet.id, nama: outlet.nama },
    })
    const r = repo(res)
    if (!r.ok) {
      console.error(`  ✗ auth user ${email}: ${r.msg}`)
      return
    }
    user = res.data.user
  } else {
    console.log(`  = auth user ${email} sudah ada`)
  }

  // 2) Claim outletId di JWT (dipakai RLS via jwt_outlet_id())
  const up = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { outletId: outlet.id },
  })
  const ru = repo(up)
  if (!ru.ok) console.error(`  ✗ claim ${outlet.id}: ${ru.msg}`)

  // 3) Row public.outlets (upsert, jaga auth_user_id)
  const db = await admin
    .from("outlets")
    .upsert(
      { id: outlet.id, nama: outlet.nama, auth_user_id: user.id },
      { onConflict: "id" }
    )
  if (db.error) console.error(`  ✗ outlets row ${outlet.id}: ${db.error.message}`)
  else console.log(`  ✓ outlet ${outlet.id} (${email} / ${OUTLET_PASSWORD})`)
}

async function ensureAdmin() {
  let { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  let user = list?.users?.find((u) => u.email === ADMIN_EMAIL)

  if (!user) {
    const res = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { isAdmin: true },
    })
    const r = repo(res)
    if (!r.ok) {
      console.error(`  ✗ auth user ${ADMIN_EMAIL}: ${r.msg}`)
      return
    }
    user = res.data.user
  } else {
    console.log(`  = auth user ${ADMIN_EMAIL} sudah ada`)
  }

  const up = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { isAdmin: true },
  })
  const ru = repo(up)
  if (!ru.ok) console.error(`  ✗ claim admin: ${ru.msg}`)
  else console.log(`  ✓ superadmin (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`)
}

console.log("Membuat user Supabase Auth…")
for (const o of OUTLETS) {
  console.log(`– ${o.id}`)
  await ensureOutlet(o)
}
await ensureAdmin()
console.log("Selesai.")
