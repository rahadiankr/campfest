# AGENT.md — Youth Camping Event Website

## 1. Project Overview

Website untuk acara camping youth dengan fitur:
- Auth & profile peserta (self sign-up)
- Informasi acara (rundown, peraturan, kontak panitia)
- Connect — tambah teman via scan QR code (instant, tanpa approval), list teman dengan filter by gereja
- Bacaan — renungan & lagu pujian
- Tombol "Kirim Salam" — external link ke web donasi Social Buzz

**Tech Stack:**
- Next.js (App Router)
- Supabase (Auth, Postgres, Storage) — Free tier
- QR generator: `qrcode.react` atau sejenis
- QR scanner: `html5-qrcode` atau `@zxing/library` (butuh HTTPS + izin kamera)

**Design direction:** "Trailmark" — tema lencana jalur & ID lanyard camp (lihat detail di Section 6: UI/Design System).

**Catatan biaya/infra:**
- Semua konten (rundown, peraturan, renungan, lagu) dikelola manual lewat Supabase Studio (Table Editor) — gratis, tidak perlu admin UI di app.
- Free tier auto-pause setelah 7 hari inactivity — perlu di-ping berkala selama masa development sampai hari-H.
- Compress/resize foto profil di client sebelum upload untuk hemat storage (1 GB) & bandwidth (5 GB/bulan).

---

## 2. Database Schema (Supabase/Postgres)

```sql
-- Master data gereja
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Profile user (extend dari auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  church_id uuid references churches(id),
  church_other text, -- dipakai kalau gereja tidak ada di list (pilih "Lainnya")
  social_media jsonb, -- contoh: {"instagram": "...", "tiktok": "..."}
  avatar_url text,
  qr_code text unique not null default gen_random_uuid(), -- encoded ke QR image
  created_at timestamptz default now()
);

-- Pertemanan (instant, tanpa approval, 2 baris per koneksi biar query 1 arah)
create table friendships (
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- Kelompok (dibuat manual oleh admin, jumlah & nama bebas)
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text, -- hex opsional untuk badge, misal '#4F7942'
  created_at timestamptz default now()
);

alter table profiles add column group_id uuid references groups(id);

-- Trigger: assign kelompok otomatis saat user baru register
-- Logic: pilih kelompok dengan jumlah anggota paling sedikit saat ini,
-- kalau ada yang seri, pilih acak di antara yang seri -> hasilnya tetap rata & fair
create or replace function assign_group()
returns trigger as $$
declare
  selected_group_id uuid;
begin
  select g.id into selected_group_id
  from groups g
  left join profiles p on p.group_id = g.id
  group by g.id
  order by count(p.id) asc, random()
  limit 1;

  new.group_id := selected_group_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_group
before insert on profiles
for each row
when (new.group_id is null)
execute function assign_group();

-- Info acara: rundown, peraturan, kontak panitia
create table event_info (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('rundown', 'rules', 'contact')) not null,
  title text,
  content text, -- markdown/plain text
  sort_order int default 0
);

-- Renungan
create table devotionals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date,
  content text not null
);

-- Lagu pujian
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lyrics text not null,
  youtube_url text
);

-- Pengaturan acara (singleton row, untuk countdown di home page)
create table event_settings (
  id int primary key default 1,
  event_name text not null default 'Trailmark',
  start_date date,
  end_date date,
  constraint single_row check (id = 1)
);
insert into event_settings (id) values (1); -- pastikan row ini selalu ada
```

**Index tambahan untuk search/filter by gereja:**
```sql
create index idx_profiles_church_id on profiles(church_id);
create index idx_churches_name on churches using gin (name gin_trgm_ops); -- perlu extension pg_trgm untuk ilike search
```

**RLS Policies (wajib, RLS belum diaktifkan = data bocor ke semua orang):**
- `profiles`: SELECT untuk semua authenticated user (karena fitur connect butuh lihat profile orang lain), UPDATE hanya untuk own row.
- `friendships`: SELECT/INSERT hanya untuk own `user_id`.
- `event_info`, `devotionals`, `songs`: SELECT untuk semua authenticated user, tidak ada INSERT/UPDATE dari client (dikelola via Studio).
- `churches`: SELECT untuk semua, INSERT bisa dibuka kalau mau auto-tambah gereja baru saat user pilih "Lainnya" (opsional).
- `groups`: SELECT untuk semua authenticated user (perlu ditampilkan sebagai label), tidak ada INSERT/UPDATE dari client (dikelola via Studio oleh admin).
- `event_settings`: SELECT untuk semua authenticated user, tidak ada INSERT/UPDATE dari client (dikelola via Studio oleh admin).

---

## 3. Routes & Pages

| Route | Deskripsi |
|---|---|
| `/` | Home — sapaan, countdown acara, shortcut menu, sorotan renungan hari ini |
| `/login`, `/register` | Auth (Supabase Auth email/password) |
| `/profile` | Lihat profile sendiri + tombol "tampilkan QR code saya" |
| `/profile/edit` | Edit nama, gereja, social media, avatar |
| `/event` | Tab: Rundown / Peraturan / Kontak Panitia |
| `/connect` | List teman + search bar (filter by nama gereja) + tombol ke scanner |
| `/connect/scan` | Kamera scan QR → langsung insert friendship |
| `/connect/[friendId]` | Profile teman (read-only): nama, gereja, social media |
| `/bacaan/renungan` | List & detail renungan |
| `/bacaan/lagu` | List & detail lagu pujian |
| Tombol "Kirim Salam" | `<a href="[URL Social Buzz]" target="_blank">` — taruh di navbar/home, bukan route terpisah |

---

## 4. Task Breakdown (urutan kerja agent)

### Phase 1 — Setup
1. Init Next.js project + Supabase client setup (env vars: URL, anon key)
2. Buat schema database di atas via Supabase Studio/migration SQL
3. Setup RLS policies
4. Setup Supabase Auth (email/password), buat halaman `/login` & `/register`

### Phase 2 — Home
5. Halaman `/` — sapaan "Halo, [nama]!" + badge kelompok
6. Komponen countdown card — fetch dari `event_settings`, hitung selisih hari ke `start_date`/`end_date`, tampilkan state: "dimulai dalam X hari" / "hari ke-X dari Y" / pesan penutup setelah `end_date`
7. Shortcut grid 2x2 ke Acara / Connect / Bacaan / Kirim Salam
8. Card "Sorotan hari ini" — fetch `devotionals` where `date = today`, sembunyikan card kalau tidak ada data

### Phase 3 — Profile
9. Buat tabel `profiles` trigger: auto-insert row `profiles` saat user baru sign up (trigger on `auth.users` insert)
10. Halaman `/profile` — tampilkan data + generate QR code dari `qr_code` field (pakai `qrcode.react`)
11. Halaman `/profile/edit` — form edit, dropdown gereja (query dari tabel `churches`) + opsi "Lainnya" (text input manual)
12. Upload avatar ke Supabase Storage, simpan URL di `profiles.avatar_url`

### Phase 4 — Informasi Acara
13. Halaman `/event` dengan 3 tab, fetch dari `event_info` berdasarkan `type`
14. Render content (markdown atau plain text sesuai isi)

### Phase 5 — Connect
15. Halaman `/connect/scan` — integrasi kamera + library QR scanner, decode `qr_code` dari hasil scan
16. Saat scan sukses → insert ke `friendships` (2 baris: user→friend dan friend→user) — tampilkan toast "Berhasil ditambahkan sebagai teman"
17. Halaman `/connect` — list teman (join `friendships` + `profiles` + `churches`), search bar untuk filter by nama gereja (client-side filter atau query `ilike` ke Supabase)
18. Halaman `/connect/[friendId]` — fetch profile teman by id, render read-only (nama, gereja, social media)
19. (Opsional) tombol unfriend di list teman

### Phase 6 — Bacaan
20. Halaman `/bacaan/renungan` — list renungan urut tanggal, detail page
21. Halaman `/bacaan/lagu` — list lagu, detail page (lyrics + embed/link YouTube kalau ada)

### Phase 7 — Kirim Salam
22. Tambahkan button/link statis ke URL Social Buzz di navbar atau homepage — tidak perlu backend/API integration

### Phase 8 — Polish
23. Responsive design (mobile-first, karena scan QR dan kemungkinan besar diakses dari HP saat camping)
24. Loading states & error handling di semua fetch
25. Cek ulang RLS policies — pastikan user A tidak bisa edit data user B
26. Test scan QR di kondisi sinyal lemah (offline-tolerant kalau perlu, minimal graceful error)

---

## 6. UI / Design System — "Trailmark"

Tema visual: lencana jalur hiking & ID lanyard camp. Dipilih karena di acara camping fisik, setiap peserta pakai name tag/lanyard — jadi fitur Connect (scan QR) terasa konsisten dengan pengalaman nyata.

### Palet Warna
| Token | Hex | Peran |
|---|---|---|
| `--cp-pine` | `#1F3A2E` | Header, nav, teks utama |
| `--cp-moss` | `#4F7942` | Brand utama, avatar/badge |
| `--cp-amber` | `#E08C3C` | CTA, accent, state aktif |
| `--cp-khaki` | `#DCC9A3` | Background sekunder |
| `--cp-parchment` | `#F8F4EA` | Background card/surface |

### Tipografi
- **Display** (nama besar, judul, ID badge): `Bebas Neue` — kesan stensil/papan jalur, dipakai terbatas (judul & elemen signature saja)
- **Body** (UI umum, navigasi, list): `Work Sans` — bobot 400/500
- **Utility/mono** (kode ID, timestamp, label QR): `JetBrains Mono`
- **Konten Bacaan** (renungan/lagu): pakai serif ringan dengan line-height lega (1.7–1.8) — berbeda dari font UI, supaya terasa "membaca" bukan "mengoperasikan app"

### Komponen Signature: Camp ID Badge
Kartu profile/QR ditampilkan seperti ID lanyard fisik: border dashed amber (kesan jahitan patch), lubang gantungan di atas, avatar bulat dengan inisial, nama dengan font display, kode ID format mono (`CMP-XXXX`), **badge kelompok** (pill kecil dengan warna dari `groups.color`, nama kelompok). Dipakai konsisten di:
- `/profile` (badge milik sendiri)
- `/connect/[friendId]` (badge milik teman, read-only)

### Pola Komponen Lain
- **Home** (`/`): countdown card background pine solid dengan angka besar font display warna amber; shortcut grid 2x2 card putih border hairline, ikon warna moss; card "Kirim Salam" dibedakan dengan border amber tebal karena ini link eksternal
- **List teman** (`/connect`): row dengan avatar bulat warna brand, nama + gereja + label kelompok kecil, chevron kanan, divider hairline antar row
- **Rundown/peraturan** (`/event`): card dengan accent stripe di kiri (border-left tebal warna moss/amber) per item, bukan tabel — biar terasa seperti papan info camp
- **Scan QR**: floating action button bulat besar warna amber, posisi mudah dijangkau jempol (karena ini fitur paling sering dipakai)
- **Bottom navigation**: 4 ikon — Home, Acara, Connect, Bacaan — ikon aktif berwarna amber

### Prinsip
- Mobile-first, flat design (tanpa gradient/shadow berlebihan)
- Warna brand dipakai sebagai aksen, bukan dominan di semua background
- Restraint: satu elemen "berani" (Camp ID Badge), elemen lain tetap tenang & disiplin

---

## 7. Hal yang Perlu Diperhatikan Selama Development
- Konten (rundown, peraturan, kontak panitia, renungan, lagu) di-input manual lewat Supabase Studio Table Editor — pastikan format `content`/`lyrics` konsisten (markdown atau plain text) sebelum mulai input massal.
- Cek project Supabase tidak auto-pause (ping minimal seminggu sekali) sampai hari acara selesai.
- Pastikan dropdown gereja punya UX yang jelas untuk opsi "Lainnya" (toggle ke text input).
- QR code berisi `qr_code` (UUID), bukan data sensitif lain — aman untuk ditampilkan/share.
- **Kelompok wajib dibuat admin di Supabase Studio SEBELUM registrasi dibuka** — trigger `assign_group` butuh minimal 1 row di tabel `groups` saat user pertama register. Kalau belum ada, `group_id` akan null.
- Menambah kelompok baru setelah ada user terdaftar tidak akan rebalance otomatis user yang sudah ada — assignment hanya berjalan saat insert baru.
