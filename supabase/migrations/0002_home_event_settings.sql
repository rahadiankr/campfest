create table public.event_settings (
  id int primary key default 1,
  event_name text not null default 'Trailmark',
  start_date date,
  end_date date,
  constraint event_settings_single_row check (id = 1),
  constraint event_settings_date_range check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  )
);

insert into public.event_settings (id)
values (1);

alter table public.event_settings enable row level security;

create policy "Event settings are readable by authenticated users"
on public.event_settings
for select
to authenticated
using (true);

grant select on public.event_settings to authenticated;
