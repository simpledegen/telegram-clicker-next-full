-- Users and clicks
create table if not exists public.users (
  id bigint primary key,                  -- Telegram user id
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clicks (
  user_id bigint primary key references public.users(id) on delete cascade,
  total bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Optional audit trail (for anti-fraud / analytics)
create table if not exists public.click_events (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  delta int not null check (delta > 0),
  created_at timestamptz not null default now()
);

-- Denormalized global totals (periodically backfilled from Redis)
create table if not exists public.meta (
  key text primary key,
  value bigint not null
);
insert into public.meta(key, value) values ('global_total', 0)
  on conflict (key) do nothing;

-- Leaderboard view (reads from clicks)
create materialized view if not exists public.leaderboard as
select u.id, u.username, c.total
from public.users u
join public.clicks c on c.user_id = u.id
order by c.total desc
limit 100;  -- cache top 100, API will slice top 20

-- Refresh policy helper
create or replace function public.touch_updated() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_touch before update on public.users
for each row execute function public.touch_updated();

create trigger clicks_touch before update on public.clicks
for each row execute function public.touch_updated();

-- RPC used by the server to atomically increment
create or replace function public.inc_clicks(user_id bigint, d int)
returns void language plpgsql as $$
begin
  insert into public.clicks(user_id, total) values (user_id, d)
  on conflict (user_id) do update set total = public.clicks.total + d, updated_at = now();
  insert into public.click_events(user_id, delta) values (user_id, d);
end;$$;
