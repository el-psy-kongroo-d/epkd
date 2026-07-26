create table if not exists comments (
  id            bigint generated always as identity primary key,
  post_slug     text not null,
  nickname      text not null check (char_length(nickname) between 1 and 24),
  password_hash text not null,
  body          text not null check (char_length(body) between 1 and 1000),
  created_at    timestamptz not null default now()
);

create index if not exists comments_post_slug_idx on comments (post_slug, created_at);

alter table comments enable row level security;
