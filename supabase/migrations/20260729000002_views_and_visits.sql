alter table posts add column if not exists views bigint not null default 0;

create table if not exists site_stats (
  id           int primary key check (id = 1),
  total_visits bigint not null default 0
);

insert into site_stats (id, total_visits) values (1, 0) on conflict do nothing;

alter table site_stats enable row level security;

create or replace function increment_post_views(post_slug text)
returns void language sql security definer set search_path = public as $$
  update posts set views = views + 1 where slug = post_slug;
$$;

create or replace function increment_site_visits()
returns bigint language sql security definer set search_path = public as $$
  update site_stats set total_visits = total_visits + 1 where id = 1 returning total_visits;
$$;

revoke execute on function increment_post_views(text) from anon, authenticated, public;
revoke execute on function increment_site_visits() from anon, authenticated, public;
