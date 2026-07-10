-- Align live schema with app expectations and fix broken updated_at triggers.

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.books
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists publisher text,
  add column if not exists pub_date date,
  add column if not exists aladin_isbn13 text,
  add column if not exists aladin_item_id bigint,
  add column if not exists aladin_category_id int,
  add column if not exists aladin_category_name text;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(NEW) ? 'updated_at' then
    NEW.updated_at = now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at before update on public.books
  for each row execute function public.touch_updated_at();
