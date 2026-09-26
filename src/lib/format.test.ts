import { describe, expect, it } from "vitest"

import { csvEscape, formatQty, tanggalHariIni } from "./format"
// downloadCsv butuh DOM; Logika inti (BOM+escape) tercakup di csvEscape.
// Uji penuh downloadCsv dijalankan manual saat smoke-test aplikasi.

describe("csvEscape", () => {
  it("lewati nilai polos", () => {
    expect(csvEscape("BT01")).toBe("BT01")
    expect(csvEscape(3)).toBe("3")
  })

  it("kutip nilai berisi pemisah, kutip, atau newline", () => {
    expect(csvEscape("a;b")).toBe('"a;b"')
    expect(csvEscape('a,"b"')).toBe('"a,""b"""')
    expect(csvEscape("a\nb")).toBe('"a\nb"')
  })

  it("payload dengan koma tidak merusak kolom", () => {
    // Nama barang umumnya mengandung koma → wajib ter-kutip agar kolom tetap 1.
    expect(csvEscape("Susu UHT 1L, 12pack")).toBe('"Susu UHT 1L, 12pack"')
  })
})

describe("formatQty", () => {
  it("format ribuan id-ID", () => {
    expect(formatQty(1234)).toBe("1.234")
  })
})

describe("tanggalHariIni", () => {
  it("berupa YYYY-MM-DD", () => {
    expect(tanggalHariIni()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
