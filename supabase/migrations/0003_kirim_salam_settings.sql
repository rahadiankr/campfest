create table public.kirim_salam_settings (
  id int primary key default 1,
  is_enabled boolean not null default false,
  updated_at timestamptz default now(),
  constraint kirim_salam_settings_single_row check (id = 1)
);

insert into public.kirim_salam_settings (id, is_enabled)
values (1, false);

alter table public.kirim_salam_settings enable row level security;

create policy "Kirim salam settings are readable by authenticated users"
on public.kirim_salam_settings
for select
to authenticated
using (true);

grant select on public.kirim_salam_settings to authenticated;
