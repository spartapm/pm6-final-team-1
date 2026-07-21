-- Book registration requests from empty search results.
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
