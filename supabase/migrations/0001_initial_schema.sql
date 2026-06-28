create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  church_id uuid references public.churches(id),
  church_other text,
  social_media jsonb,
  avatar_url text,
  qr_code text unique not null default gen_random_uuid(),
  group_id uuid references public.groups(id),
  created_at timestamptz default now()
);

create table public.friendships (
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self_friend check (user_id <> friend_id)
);

create table public.event_info (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('rundown', 'rules', 'contact')) not null,
  title text,
  content text,
  sort_order int default 0
);

create table public.devotionals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date,
  content text not null
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lyrics text not null,
  youtube_url text
);

create index idx_profiles_church_id on public.profiles(church_id);
create index idx_churches_name on public.churches using gin (name gin_trgm_ops);

create or replace function public.assign_group()
returns trigger
language plpgsql
as $$
declare
  selected_group_id uuid;
begin
  select g.id into selected_group_id
  from public.groups g
  left join public.profiles p on p.group_id = g.id
  group by g.id
  order by count(p.id) asc, random()
  limit 1;

  new.group_id := selected_group_id;
  return new;
end;
$$;

create trigger trg_assign_group
before insert on public.profiles
for each row
when (new.group_id is null)
execute function public.assign_group();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_full_name text;
begin
  profile_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');

  if profile_full_name is null then
    raise exception 'Missing full_name in auth user metadata for user id %', new.id;
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, profile_full_name);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.churches enable row level security;
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.event_info enable row level security;
alter table public.devotionals enable row level security;
alter table public.songs enable row level security;

create policy "Churches are readable by everyone"
on public.churches
for select
to anon, authenticated
using (true);

create policy "Groups are readable by authenticated users"
on public.groups
for select
to authenticated
using (true);

create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read their own friendships"
on public.friendships
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their own friendships"
on public.friendships
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Event info is readable by authenticated users"
on public.event_info
for select
to authenticated
using (true);

create policy "Devotionals are readable by authenticated users"
on public.devotionals
for select
to authenticated
using (true);

create policy "Songs are readable by authenticated users"
on public.songs
for select
to authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.churches to anon, authenticated;
grant select on public.groups to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.friendships to authenticated;
grant select on public.event_info to authenticated;
grant select on public.devotionals to authenticated;
grant select on public.songs to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Avatar images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
