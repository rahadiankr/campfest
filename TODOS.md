# TODOS.md — Youth Camping Event Website

> Checklist eksekusi untuk agent. Urutan mengikuti dependency (jangan lompat phase kecuali memang tidak ada dependency). Update checkbox `[x]` setiap task selesai. Detail schema/route/desain lengkap ada di `AGENT.md`.

---

## Phase 1 — Setup

- [x] Init Next.js project (App Router)
- [x] Install dependency: `@supabase/supabase-js`, `qrcode.react`, `html5-qrcode` (atau `@zxing/library`)
- [x] Setup Supabase client (`lib/supabase.ts`), simpan `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local`
- [x] Buat tabel: `churches`, `profiles`, `friendships`, `event_info`, `devotionals`, `songs`, `groups` (lihat `supabase/migrations/0001_initial_schema.sql`)
- [x] Tambahkan kolom `group_id` di `profiles` (FK ke `groups`)
- [x] Buat function & trigger `assign_group` (balanced random assignment) — jalan otomatis saat insert ke `profiles`
- [x] Buat index: `idx_profiles_church_id`, `idx_churches_name` (enable extension `pg_trgm` dulu)
- [x] Aktifkan RLS di semua tabel + buat policy sesuai AGENT.md Section 2
- [ ] Setup Supabase Auth (email/password)
- [x] Buat trigger: auto-insert row `profiles` saat ada user baru di `auth.users`
- [x] Halaman `/login`
- [x] Halaman `/register`
- [x] Setup layout dasar: bottom navigation (Home / Acara / Connect / Bacaan) + global font (Bebas Neue, Work Sans, JetBrains Mono dari Google Fonts)
- [x] Setup design tokens warna (`--cp-pine`, `--cp-moss`, `--cp-amber`, `--cp-khaki`, `--cp-parchment`) sebagai CSS variables global

## Phase 2 — Profile

- [x] Halaman `/profile` — tampilkan data user
- [x] Komponen `CampIdBadge` (signature element: border dashed amber, avatar bulat, nama font display, kode ID mono, badge kelompok) — reusable, dipakai juga di Phase 4
- [x] Generate QR code dari field `qr_code` di komponen `CampIdBadge`
- [x] Halaman `/profile/edit` — form nama, social media, avatar
- [x] Dropdown gereja (query dari tabel `churches`) + opsi "Lainnya" → toggle ke text input (`church_other`)
- [x] Upload avatar ke Supabase Storage, simpan URL ke `profiles.avatar_url`
- [x] Compress/resize gambar di client sebelum upload (jaga kuota storage free tier)

## Phase 3 — Home

- [x] Halaman `/` — sapaan "Halo, [nama]!" + badge kelompok
- [x] Komponen countdown card — fetch `event_settings`, hitung selisih hari ke `start_date`/`end_date`
- [x] Logic state countdown: "dimulai dalam X hari" / "hari ke-X dari Y" / pesan penutup setelah event selesai
- [x] Shortcut grid 2x2 — Acara / Connect / Bacaan / Kirim Salam (card Kirim Salam diberi border amber tebal sebagai pembeda link eksternal)
- [x] Card "Sorotan hari ini" — fetch `devotionals` where `date = today`, sembunyikan card kalau tidak ada data

## Phase 4 — Informasi Acara

- [ ] Halaman `/event` dengan 3 tab: Rundown / Peraturan / Kontak Panitia
- [ ] Fetch & render dari tabel `event_info` berdasarkan `type`, urut by `sort_order`
- [ ] Styling card dengan accent stripe kiri (border-left) per item rundown

## Phase 5 — Connect

- [ ] Halaman `/connect/scan` — integrasi kamera + library QR scanner
- [ ] Floating action button (FAB) amber untuk akses cepat ke scanner dari halaman `/connect`
- [ ] Logic: scan sukses → decode `qr_code` → insert 2 baris ke `friendships` (dua arah)
- [ ] Toast notifikasi "Berhasil ditambahkan sebagai teman"
- [ ] Handle edge case: scan QR diri sendiri, scan QR yang sudah jadi teman (cegah duplicate insert)
- [ ] Halaman `/connect` — list teman (join `friendships` + `profiles` + `churches` + `groups`)
- [ ] Tampilkan badge kelompok (warna + nama) di tiap row list teman
- [ ] Search bar filter list teman by nama gereja
- [ ] Halaman `/connect/[friendId]` — render `CampIdBadge` read-only (tanpa tombol edit)
- [ ] (Opsional) tombol unfriend di list teman

## Phase 6 — Bacaan

- [ ] Halaman `/bacaan/renungan` — list renungan urut tanggal (terbaru di atas)
- [ ] Detail page renungan — gunakan font serif ringan + line-height lega untuk konten
- [ ] Halaman `/bacaan/lagu` — list lagu pujian
- [ ] Detail page lagu — tampilkan lyrics + embed/link YouTube kalau `youtube_url` terisi

## Phase 7 — Kirim Salam

- [ ] Tambahkan button/link statis ke URL Social Buzz (`target="_blank"`) atau homepage

## Phase 8 — Polish & QA

- [ ] Responsive check di semua halaman (mobile-first, test di viewport HP)
- [ ] Loading state di semua fetch data (skeleton/spinner)
- [ ] Error handling di semua fetch (terutama scan QR & network gagal)
- [ ] Re-test RLS policies — pastikan user A tidak bisa baca/edit data user B di luar yang diizinkan
- [ ] Test scan QR di kondisi sinyal lemah — pastikan ada graceful error message
- [ ] Cek aksesibilitas dasar: kontras warna (amber di atas pine/parchment), ukuran tap target tombol di mobile
- [ ] Cek konsistensi visual: `CampIdBadge` sama persis antara `/profile` dan `/connect/[friendId]`

## Pre-Launch Checklist (Infra)

- [ ] **Buat data kelompok di Supabase Studio SEBELUM registrasi dibuka** (nama + warna tiap kelompok) — wajib, trigger `assign_group` butuh minimal 1 row
- [ ] Test trigger `assign_group` dengan beberapa dummy sign-up — pastikan distribusi rata antar kelompok
- [ ] Input semua konten awal ke Supabase Studio: rundown, peraturan, kontak panitia, minimal 1 renungan & 1 lagu (untuk testing)
- [ ] Pastikan format `content`/`lyrics` konsisten sebelum input massal ke seluruh data
- [ ] Set reminder ping project Supabase minimal seminggu sekali (cegah auto-pause free tier)
- [ ] Cek kuota storage (foto profil) & bandwidth masih dalam batas free tier mendekati hari-H
- [ ] Final test end-to-end: register → edit profile → scan QR teman lain → cek list connect → baca renungan → klik kirim salam
