create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null,
  nickname text not null,
  tag text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  cover_url text,
  description text,
  genres text[] not null default '{}',
  publisher text,
  pub_date date,
  aladin_isbn text,
  aladin_isbn13 text,
  aladin_item_id bigint,
  aladin_category_id int,
  aladin_category_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 30 and 1000),
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_target_check check (
    (review_id is not null and comment_id is null)
    or (review_id is null and comment_id is not null)
  ),
  constraint reports_review_once unique (reporter_id, review_id),
  constraint reports_comment_once unique (reporter_id, comment_id)
);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.random_tag()
returns text
language sql
as $$
  select lpad(floor(random() * 10000)::int::text, 4, '0')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email, nickname, tag)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nickname', '독서광'),
    public.random_tag()
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at before update on public.books
  for each row execute function public.touch_updated_at();

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at before update on public.reviews
  for each row execute function public.touch_updated_at();

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at before update on public.comments
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_follows enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile" on public.profiles for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists "books are readable" on public.books;
create policy "books are readable" on public.books for select using (true);

drop policy if exists "authenticated users can upsert books" on public.books;
create policy "authenticated users can upsert books" on public.books for insert
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can update books" on public.books;
create policy "authenticated users can update books" on public.books for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "follows are readable" on public.book_follows;
create policy "follows are readable" on public.book_follows for select using (true);

drop policy if exists "users manage their follows" on public.book_follows;
create policy "users manage their follows" on public.book_follows for all
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists "published reviews are readable" on public.reviews;
create policy "published reviews are readable" on public.reviews for select
using (is_draft = false or user_id = public.current_profile_id());

drop policy if exists "users create reviews" on public.reviews;
create policy "users create reviews" on public.reviews for insert
with check (user_id = public.current_profile_id());

drop policy if exists "users update own reviews" on public.reviews;
create policy "users update own reviews" on public.reviews for update
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists "users delete own reviews" on public.reviews;
create policy "users delete own reviews" on public.reviews for delete
using (user_id = public.current_profile_id());

drop policy if exists "review likes are readable" on public.review_likes;
create policy "review likes are readable" on public.review_likes for select using (true);

drop policy if exists "users manage review likes" on public.review_likes;
create policy "users manage review likes" on public.review_likes for all
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable" on public.comments for select using (true);

drop policy if exists "users create comments" on public.comments;
create policy "users create comments" on public.comments for insert
with check (user_id = public.current_profile_id());

drop policy if exists "users update own comments" on public.comments;
create policy "users update own comments" on public.comments for update
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete
using (user_id = public.current_profile_id());

drop policy if exists "comment likes are readable" on public.comment_likes;
create policy "comment likes are readable" on public.comment_likes for select using (true);

drop policy if exists "users manage comment likes" on public.comment_likes;
create policy "users manage comment likes" on public.comment_likes for all
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

drop policy if exists "users create reports" on public.reports;
create policy "users create reports" on public.reports for insert
with check (reporter_id = public.current_profile_id());

drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports for select
using (reporter_id = public.current_profile_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile images are public" on storage.objects;
create policy "profile images are public" on storage.objects for select
using (bucket_id = 'profile-images');

drop policy if exists "users upload own profile images" on storage.objects;
create policy "users upload own profile images" on storage.objects for insert
with check (
  bucket_id = 'profile-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own profile images" on storage.objects;
create policy "users update own profile images" on storage.objects for update
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own profile images" on storage.objects;
create policy "users delete own profile images" on storage.objects for delete
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create index if not exists profiles_auth_user_idx on public.profiles (auth_user_id);
create index if not exists books_title_author_idx on public.books using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '')));
create index if not exists book_follows_book_idx on public.book_follows (book_id);
create index if not exists reviews_book_created_idx on public.reviews (book_id, created_at desc);
create index if not exists reviews_user_created_idx on public.reviews (user_id, created_at desc);
create index if not exists review_likes_review_idx on public.review_likes (review_id);
create index if not exists comments_review_created_idx on public.comments (review_id, created_at asc);
create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);
