create table if not exists collections (
  id text primary key,
  title text not null,
  hidden boolean not null default false,
  tiles jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists board_settings (
  id integer primary key,
  password_hash text not null
);
