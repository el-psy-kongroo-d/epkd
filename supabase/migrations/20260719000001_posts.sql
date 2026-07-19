create table if not exists posts (
  slug        text primary key,
  title       text not null,
  date        date not null,
  content     text not null,
  updated_at  timestamptz not null default now()
);

alter table posts enable row level security;
