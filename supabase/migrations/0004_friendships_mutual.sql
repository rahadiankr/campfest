-- Adds a mutual friendship from a scanned QR code.
create or replace function public.add_friend_by_qr(friend_qr_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  curr_user_id uuid;
  friend_rec record;
begin
  -- Read the authenticated user id.
  curr_user_id := auth.uid();
  if curr_user_id is null then
    raise exception 'Unauthorized: User must be logged in';
  end if;

  -- Find the friend profile by qr_code.
  select id, full_name into friend_rec
  from public.profiles
  where qr_code = friend_qr_code;

  if friend_rec.id is null then
    raise exception 'Kode QR tidak valid atau profile tidak ditemukan';
  end if;

  if friend_rec.id = curr_user_id then
    raise exception 'Tidak dapat menambahkan diri sendiri sebagai teman';
  end if;

  -- Insert user_id -> friend_id.
  insert into public.friendships (user_id, friend_id)
  values (curr_user_id, friend_rec.id)
  on conflict (user_id, friend_id) do nothing;

  -- Insert friend_id -> user_id.
  insert into public.friendships (user_id, friend_id)
  values (friend_rec.id, curr_user_id)
  on conflict (user_id, friend_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'friend_id', friend_rec.id,
    'full_name', friend_rec.full_name
  );
end;
$$;

-- Allow authenticated users to run the RPC.
grant execute on function public.add_friend_by_qr(text) to authenticated;

-- Allow either connected user to remove both friendship rows.
create policy "Users can delete friendships involving themselves"
on public.friendships
for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);
