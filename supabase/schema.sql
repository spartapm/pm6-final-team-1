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
  title text,
  author text,
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

alter table public.books alter column title drop not null;
alter table public.books alter column author drop not null;

create table if not exists public.featured_book_isbns (
  isbn13 text primary key check (isbn13 ~ '^[0-9]{13}$')
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
declare
  next_nickname text;
begin
  next_nickname := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    '독서광'
  )), '');

  insert into public.profiles (auth_user_id, email, nickname, tag, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(next_nickname, '독서광'), 10),
    public.random_tag(),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      null
    )
  )
  on conflict (auth_user_id) do update
    set
      nickname = case
        when public.profiles.nickname = '독서광'
          and excluded.nickname is not null
          and excluded.nickname <> '독서광'
        then excluded.nickname
        else public.profiles.nickname
      end,
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      email = case
        when coalesce(public.profiles.email, '') = '' then excluded.email
        else public.profiles.email
      end;

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
alter table public.featured_book_isbns enable row level security;
alter table public.book_follows enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);

drop policy if exists "users create their profile" on public.profiles;
create policy "users create their profile" on public.profiles for insert
with check (auth_user_id = auth.uid());

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile" on public.profiles for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists "users delete their profile" on public.profiles;
create policy "users delete their profile" on public.profiles for delete
using (auth_user_id = auth.uid());

drop policy if exists "books are readable" on public.books;
create policy "books are readable" on public.books for select using (true);

drop policy if exists "featured book isbns are readable" on public.featured_book_isbns;
create policy "featured book isbns are readable" on public.featured_book_isbns for select using (true);

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

insert into public.featured_book_isbns (isbn13)
values
  ('9788936434120'),
  ('9788925588735'),
  ('9791194530701'),
  ('9788937460586'),
  ('9788954682152'),
  ('9791199305304'),
  ('9788937473401'),
  ('9791192372730'),
  ('9791191114768'),
  ('9791124248171'),
  ('9791193506516'),
  ('9788937461798'),
  ('9788925554990'),
  ('9791124038413'),
  ('9791172134297'),
  ('9791192559100'),
  ('9791199383074'),
  ('9791155819227'),
  ('9791130646381'),
  ('9791199496651'),
  ('9791197221989'),
  ('9788932043562'),
  ('9791173323027'),
  ('9791187232629'),
  ('9788937460883'),
  ('9791199489530'),
  ('9791162544327'),
  ('9791141603250'),
  ('9788936439965'),
  ('9791193401583'),
  ('9791124497029'),
  ('9788936439880'),
  ('9788937460708'),
  ('9791173578601'),
  ('9791175773370'),
  ('9791173579721'),
  ('9791194368175'),
  ('9788954646079'),
  ('9791141603373'),
  ('9791141617226'),
  ('9791167372864'),
  ('9791194330424'),
  ('9791193238691'),
  ('9791167742063'),
  ('9791175773387'),
  ('9791198547514'),
  ('9791175773394'),
  ('9791170612759'),
  ('9791191043297'),
  ('9791141602024'),
  ('9791192300818'),
  ('9791198754080'),
  ('9788962626605'),
  ('9791159921445'),
  ('9788954616515'),
  ('9791193842287'),
  ('9791139728002'),
  ('9791167740984'),
  ('9791199555112'),
  ('9788954651134'),
  ('9791193153710'),
  ('9791124638002'),
  ('9791141615055'),
  ('9791194530398'),
  ('9788937460616'),
  ('9791141602383'),
  ('9791175780170'),
  ('9791141601300'),
  ('9791194374299'),
  ('9791168343108'),
  ('9791192389233'),
  ('9791139716146'),
  ('9791168341890'),
  ('9788936439651'),
  ('9791167903662'),
  ('9788954699075'),
  ('9791169851626'),
  ('9791199242531'),
  ('9791124038192'),
  ('9791194413394'),
  ('9788937462146'),
  ('9791190669030'),
  ('9791193904152'),
  ('9788960909878'),
  ('9791193078709'),
  ('9791199624993'),
  ('9788965138310'),
  ('9791193262658'),
  ('9791130674643'),
  ('9791130698199'),
  ('9788925573229'),
  ('9791130681009'),
  ('9788960909960'),
  ('9791168343764'),
  ('9791141603380'),
  ('9791193939666'),
  ('9791193939314'),
  ('9791199040311'),
  ('9791192097978'),
  ('9791171175864')
on conflict (isbn13) do nothing;

create table if not exists public.book_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  search_query text,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.book_requests enable row level security;

drop policy if exists "authenticated users can create book requests" on public.book_requests;
create policy "authenticated users can create book requests" on public.book_requests for insert
with check (auth.role() = 'authenticated');

drop policy if exists "users read own book requests" on public.book_requests;
create policy "users read own book requests" on public.book_requests for select
using (requested_by = public.current_profile_id() or requested_by is null);

create index if not exists book_requests_created_at_idx on public.book_requests (created_at desc);
