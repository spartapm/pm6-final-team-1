-- Add profile self-delete policy for account deletion flow.
drop policy if exists "users delete their profile" on public.profiles;
create policy "users delete their profile" on public.profiles for delete
using (auth_user_id = auth.uid());
