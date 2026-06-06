
create table public.competitions(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entry_fee numeric not null default 0,
  prize_pool numeric not null default 0,
  stripe_link text,
  admin_pin text not null,
  current_week int not null default 1,
  created_at timestamptz not null default now()
);

create table public.players(
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  paid boolean not null default false,
  alive boolean not null default true,
  magic_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table public.picks(
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  week int not null,
  team text not null,
  result text,
  created_at timestamptz not null default now(),
  unique(player_id, week)
);

grant all on public.competitions to service_role;
grant all on public.players to service_role;
grant all on public.picks to service_role;

alter table public.competitions enable row level security;
alter table public.players enable row level security;
alter table public.picks enable row level security;

insert into public.competitions(name, entry_fee, prize_pool, stripe_link, admin_pin, current_week)
values ('Demo Comp 2', 20, 400, 'https://buy.stripe.com/test_demo', '1234', 1);
