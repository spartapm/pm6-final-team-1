-- Prefer Kakao/OAuth display names over the default nickname "독서광".
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
